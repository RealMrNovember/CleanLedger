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
} from "@/lib/auth-api";
import { ensureLicense, getInstallationId } from "@/lib/license-client";
import { runSyncPull, runSyncPush, initSyncListeners } from "@/lib/sync-service";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signup: (input: SignupInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(getSession());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    void runSyncPull().then((changed) => {
      if (changed) window.dispatchEvent(new Event("cleanledger-sync"));
    });
    return initSyncListeners(() => {
      window.dispatchEvent(new Event("cleanledger-sync"));
    });
  }, [session?.token]);

  const signup = useCallback(async (input: SignupInput) => {
    const s = await apiSignup(input);
    try {
      await ensureLicense(getInstallationId());
    } catch {
      /* trial may already exist — signup still succeeds */
    }
    setSession(s);
    await runSyncPull();
    void runSyncPush();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const s = await apiLogin(email, password);
    try {
      await ensureLicense(getInstallationId());
    } catch {
      /* keep login if license server unreachable */
    }
    setSession(s);
    await runSyncPull();
    void runSyncPush();
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        loading,
        signup,
        login,
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
