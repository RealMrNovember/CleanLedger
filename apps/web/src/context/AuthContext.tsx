import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession, SignupInput } from "@/lib/auth-api";
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
  activateLicense,
  getInstallationId,
  clearLicenseCache,
  saveLicenseCache,
  isLicenseUsable,
  type LicenseSnapshot,
} from "@/lib/license-client";
import { runSyncPull, runSyncPush, initSyncListeners } from "@/lib/sync-service";
import { saveShopProfile } from "@/lib/shop-profile";
import {
  bindAuthSession,
  clearTenantContext,
  switchTenantContext,
  hydrateOrganizationProfileCache,
} from "@/db/client";

interface AuthContextValue {
  user: AuthSession["user"] | null;
  token: string | null;
  license: LicenseSnapshot | null;
  licenseUsable: boolean;
  loading: boolean;
  signup: (input: SignupInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  refreshLicense: () => Promise<void>;
  activateLicenseKey: (licenseKey: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LICENSE_REFRESH_MS = 5 * 60 * 1000;

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

    const snapshot = await ensureLicense(
      getInstallationId(),
      licenseContextFromSession(activeSession)
    );
    setLicense(snapshot);
  }, []);

  const refreshLicense = useCallback(async () => {
    await syncLicense(session ?? getSession());
  }, [session, syncLicense]);

  const activateLicenseKey = useCallback(
    async (licenseKey: string) => {
      const activeSession = session ?? getSession();
      if (!activeSession?.user) {
        throw new Error("Oturum bulunamadı.");
      }
      const snapshot = await activateLicense(
        getInstallationId(),
        licenseKey,
        licenseContextFromSession(activeSession)
      );
      saveLicenseCache(snapshot, activeSession.user.email);
      setLicense(snapshot);
    },
    [session]
  );

  useEffect(() => {
    const saved = getSession();
    if (saved?.user?.email) {
      switchTenantContext(saved.user.email);
    }
    setSession(saved);
    void hydrateOrganizationProfileCache();
    void syncLicense(saved).finally(() => setLoading(false));
  }, [syncLicense]);

  useEffect(() => {
    if (!session?.token) return;

    void runSyncPull().then((changed) => {
      if (changed) window.dispatchEvent(new Event("cleanledger-sync"));
    });

    const syncInterval = window.setInterval(() => {
      void syncLicense(session);
    }, LICENSE_REFRESH_MS);

    const handleFocus = () => {
      void syncLicense(session);
    };
    window.addEventListener("focus", handleFocus);

    const removeSyncListeners = initSyncListeners(() => {
      window.dispatchEvent(new Event("cleanledger-sync"));
    });

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("focus", handleFocus);
      removeSyncListeners();
    };
  }, [session, syncLicense]);

  const signup = useCallback(
    async (input: SignupInput) => {
      clearLicenseCache();
      const s = await apiSignup(input);
      await bindAuthSession(s.user, s.token);
      await saveShopProfile({
        companyName: input.companyName.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        logoDataUrl: input.logoDataUrl,
      });
      await syncLicense(s);
      setSession(s);
      await runSyncPull(true);
      void runSyncPush();
    },
    [syncLicense]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      clearLicenseCache();
      const s = await apiLogin(email, password);
      await bindAuthSession(s.user, s.token);
      await syncLicense(s);
      setSession(s);
      await runSyncPull(true);
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
    clearTenantContext();
    setSession(null);
    setLicense(null);
  }, []);

  const licenseUsable = Boolean(session?.user) && isLicenseUsable(license);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        license,
        licenseUsable,
        loading,
        signup,
        login,
        changePassword,
        refreshLicense,
        activateLicenseKey,
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
