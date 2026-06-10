import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession, AuthUser, SignupInput } from "@/lib/auth-api";
import {
  getSession,
  clearSession,
  signup as apiSignup,
  login as apiLogin,
  changePassword as apiChangePassword,
  type ChangePasswordInput,
} from "@/lib/auth-api";
import {
  ensureLicense,
  getInstallationId,
  getLicenseCache,
  clearLicenseCache,
  type LicenseSnapshot,
} from "@/lib/license-client";
import { runSyncPull, runSyncPush, initSyncListeners } from "@/lib/sync-service";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  license: LicenseSnapshot | null;
  loading: boolean;
  signup: (input: SignupInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  refreshLicense: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function licenseContextFromSession(session: AuthSession | null) {
  if (!session?.user) return undefined;
  return {
    email: session.user.email,
    clientName: session.user.companyName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [license, setLicense] = useState<LicenseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const syncLicense = useCallback(async (activeSession: AuthSession | null) => {
    if (!activeSession?.user) {
      setLicense(null);
      return;
    }

    try {
      const snapshot = await ensureLicense(
        getInstallationId(),
        licenseContextFromSession(activeSession)
      );
      setLicense(snapshot);
    } catch {
      setLicense(getLicenseCache());
    }
  }, []);

  const refreshLicense = useCallback(async () => {
    await syncLicense(session ?? getSession());
  }, [session, syncLicense]);

  useEffect(() => {
    const saved = getSession();
    setSession(saved);
    void syncLicense(saved).finally(() => setLoading(false));
  }, [syncLicense]);

  useEffect(() => {
    if (!session?.token) return;
    void runSyncPull().then((changed) => {
      if (changed) window.dispatchEvent(new Event("cleanledger-sync"));
    });
    return initSyncListeners(() => {
      window.dispatchEvent(new Event("cleanledger-sync"));
    });
  }, [session?.token]);

  const signup = useCallback(
    async (input: SignupInput) => {
      const s = await apiSignup(input);
      try {
        await syncLicense(s);
      } catch {
        /* signup still succeeds */
      }
      setSession(s);
      await runSyncPull();
      void runSyncPush();
    },
    [syncLicense]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const s = await apiLogin(email, password);
      try {
        await syncLicense(s);
      } catch {
        /* keep login if license server unreachable */
      }
      setSession(s);
      await runSyncPull();
      void runSyncPush();
    },
    [syncLicense]
  );

  const changePassword = useCallback(
    async (input: ChangePasswordInput) => {
      const current = session ?? getSession();
      if (!current?.token || !current.user?.email) {
        throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      }
      const s = await apiChangePassword(
        current.token,
        current.user.email,
        input
      );
      setSession(s);
    },
    [session]
  );

  const logout = useCallback(() => {
    clearSession();
    clearLicenseCache();
    setSession(null);
    setLicense(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        license,
        loading,
        signup,
        login,
        changePassword,
        refreshLicense,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
