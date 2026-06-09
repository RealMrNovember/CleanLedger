import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession, AuthUser } from "@/lib/auth-api";
import {
  loginRemote,
  fetchProfileRemote,
} from "@/lib/auth-api";
import { ensureLicense, isLicenseUsable } from "@/lib/license-client";
import { getInstallationId } from "@/lib/installation";
import { runSyncPull, runSyncPush, initSyncListeners } from "@/lib/sync-service";
import {
  initDatabase,
  saveOrganizationSettings,
  clearOrganizationSettings,
  type OrganizationInput,
} from "@/db/client";
import type { OrganizationSettings } from "@/db/schema";

const SESSION_KEY = "cleanledger_desktop_session";

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null): void {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function isValidSession(session: AuthSession | null): session is AuthSession {
  return Boolean(
    session?.token?.trim() &&
      session.user?.email?.trim() &&
      session.user?.companyName?.trim()
  );
}

async function clearAuthState(): Promise<void> {
  persistSession(null);
  await clearOrganizationSettings();
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  organization: OrganizationSettings | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncOrganization(
  session: AuthSession
): Promise<OrganizationSettings> {
  let profile = session.user;
  try {
    profile = await fetchProfileRemote(session.token);
  } catch {
    /* use session user */
  }

  const input: OrganizationInput = {
    companyName: profile.companyName,
    adminName: profile.ownerName,
    email: profile.email,
    authToken: session.token,
    trialEndsAt: profile.trialEndsAt,
  };
  return saveOrganizationSettings(input);
}

async function verifyLicense(): Promise<void> {
  const hwid = getInstallationId();
  const license = await ensureLicense(hwid);
  if (!isLicenseUsable(license)) {
    throw new Error(
      "Lisansınız aktif değil veya süresi dolmuş. Lütfen Cicibyte ile iletişime geçin."
    );
  }
}

async function restoreSession(
  saved: AuthSession
): Promise<AuthSession | null> {
  if (!isValidSession(saved)) {
    await clearAuthState();
    return null;
  }

  if (import.meta.env.PROD) {
    try {
      const profile = await fetchProfileRemote(saved.token);
      const validated: AuthSession = { token: saved.token, user: profile };
      persistSession(validated);
      return validated;
    } catch {
      await clearAuthState();
      return null;
    }
  }

  return saved;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [organization, setOrganization] = useState<OrganizationSettings | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        await initDatabase();
        const saved = loadSession();
        const restored = saved ? await restoreSession(saved) : null;

        if (restored) {
          const org = await syncOrganization(restored);
          if (!org.authToken?.trim()) {
            await clearAuthState();
            return;
          }
          setSession(restored);
          setOrganization(org);
          try {
            await verifyLicense();
          } catch {
            /* offline grace: keep session if license check fails */
          }
          await runSyncPull();
          initSyncListeners(() => {
            window.dispatchEvent(new Event("cleanledger-sync"));
          });
        } else if (saved) {
          await clearAuthState();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginRemote(email, password);
    if (!isValidSession(next)) {
      throw new Error(
        "Sunucu geçersiz oturum döndürdü. Hesap bilgileriniz eksik olabilir; destek ile iletişime geçin."
      );
    }

    try {
      await verifyLicense();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lisans doğrulaması başarısız.";
      console.warn("[CleanLedger] Lisans doğrulaması atlandı:", message);
    }

    persistSession(next);

    let org: OrganizationSettings;
    try {
      org = await syncOrganization(next);
    } catch (err) {
      persistSession(null);
      throw new Error(
        err instanceof Error
          ? `Giriş sonrası yerel kayıt başarısız: ${err.message}`
          : "Giriş sonrası yerel kayıt başarısız."
      );
    }

    setSession(next);
    setOrganization(org);

    try {
      await runSyncPull();
    } catch (err) {
      console.warn("[CleanLedger] Bulut senkronizasyonu atlandı:", err);
    }
    void runSyncPush();
  }, []);

  const logout = useCallback(async () => {
    await clearAuthState();
    setSession(null);
    setOrganization(null);
  }, []);

  const token = session?.token?.trim() ?? null;

  return (
    <AuthContext.Provider
      value={{
        user: token ? (session?.user ?? null) : null,
        token,
        organization,
        loading,
        isAuthenticated: Boolean(token && session?.user),
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
