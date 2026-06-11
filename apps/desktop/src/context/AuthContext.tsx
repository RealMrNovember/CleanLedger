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
  changePasswordRemote,
  type ChangePasswordInput,
} from "@/lib/auth-api";
import {
  clearLicenseCache,
  ensureLicense,
  activateLicense,
  saveLicenseCache,
  isLicenseUsable,
  type LicenseContext,
  type LicenseSnapshot,
} from "@/lib/license-client";
import { getInstallationId } from "@/lib/installation";
import { runSyncPull, initSyncListeners } from "@/lib/sync-service";
import {
  initDatabase,
  hydrateOrganizationProfileCache,
  saveOrganizationSettings,
  clearOrganizationSettings,
  switchTenantContext,
  type OrganizationInput,
} from "@/db/client";
import type { OrganizationSettings } from "@/db/schema";
import { formatUnknownError } from "@/lib/utils";

const SESSION_KEY = "cleanledger_desktop_session";
const LICENSE_REFRESH_MS = 5 * 60 * 1000;

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
  clearLicenseCache();
  await clearOrganizationSettings();
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  organization: OrganizationSettings | null;
  license: LicenseSnapshot | null;
  licenseUsable: boolean;
  loading: boolean;
  dbError: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  refreshLicense: () => Promise<void>;
  activateLicenseKey: (licenseKey: string) => Promise<void>;
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

function licenseContextFromSession(
  session: AuthSession | null
): LicenseContext | undefined {
  if (!session?.user) return undefined;
  return {
    email: session.user.email,
    clientName: session.user.companyName,
  };
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
  const [license, setLicense] = useState<LicenseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

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
    await syncLicense(session ?? loadSession());
  }, [session, syncLicense]);

  const activateLicenseKey = useCallback(
    async (licenseKey: string) => {
      const activeSession = session ?? loadSession();
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
    void (async () => {
      try {
        await initDatabase();
        await hydrateOrganizationProfileCache();
      } catch (err) {
        setDbError(formatUnknownError(err, "Veritabanı başlatılamadı."));
        console.error("[CleanLedger] initDatabase failed:", err);
        return;
      }

      try {
        const saved = loadSession();
        const restored = saved ? await restoreSession(saved) : null;

        if (restored) {
          await switchTenantContext(restored.user.email);
          const org = await syncOrganization(restored);
          if (!org.authToken?.trim()) {
            await clearAuthState();
            return;
          }
          setSession(restored);
          setOrganization(org);
          await syncLicense(restored);
          try {
            const pulled = await runSyncPull(true);
            if (pulled) {
              window.dispatchEvent(new Event("cleanledger-sync"));
            }
          } catch (err) {
            console.warn("[CleanLedger] Bulut senkronizasyonu atlandı:", err);
          }
          initSyncListeners(() => {
            window.dispatchEvent(new Event("cleanledger-sync"));
          });
        } else if (saved) {
          await clearAuthState();
        }
      } catch (err) {
        console.warn("[CleanLedger] Oturum geri yüklenemedi:", err);
        try {
          await clearAuthState();
        } catch (clearErr) {
          console.warn("[CleanLedger] Oturum temizlenemedi:", clearErr);
        }
      }
    })().finally(() => {
      setLoading(false);
    });
  }, [syncLicense]);

  useEffect(() => {
    if (!session?.token) return;

    const syncInterval = window.setInterval(() => {
      void syncLicense(session);
    }, LICENSE_REFRESH_MS);

    const handleFocus = () => {
      void syncLicense(session);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [session, syncLicense]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (dbError) {
        throw new Error(`Veritabanı hazır değil: ${dbError}`);
      }

      const next = await loginRemote(email, password);
      if (!isValidSession(next)) {
        throw new Error(
          "Sunucu geçersiz oturum döndürdü. Hesap bilgileriniz eksik olabilir; destek ile iletişime geçin."
        );
      }

      clearLicenseCache();
      persistSession(next);

      let org: OrganizationSettings;
      try {
        await switchTenantContext(next.user.email);
        org = await syncOrganization(next);
      } catch (err) {
        persistSession(null);
        throw new Error(
          err instanceof Error
            ? `Giriş sonrası yerel kayıt başarısız: ${err.message}`
            : "Giriş sonrası yerel kayıt başarısız."
        );
      }

      await syncLicense(next);
      setSession(next);
      setOrganization(org);

      try {
        const pulled = await runSyncPull(true);
        if (pulled) {
          window.dispatchEvent(new Event("cleanledger-sync"));
        }
      } catch (err) {
        console.warn("[CleanLedger] Bulut senkronizasyonu atlandı:", err);
      }
    },
    [dbError, syncLicense]
  );

  const changePassword = useCallback(
    async (input: ChangePasswordInput) => {
      const current = session ?? loadSession();
      if (!current?.token || !current.user?.email) {
        throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      }
      const next = await changePasswordRemote(
        current.token,
        current.user.email,
        input
      );
      persistSession(next);
      setSession(next);
      const org = await syncOrganization(next);
      setOrganization(org);
    },
    [session]
  );

  const logout = useCallback(async () => {
    await clearAuthState();
    setSession(null);
    setOrganization(null);
    setLicense(null);
  }, []);

  const token = session?.token?.trim() ?? null;
  const licenseUsable = Boolean(token && session?.user) && isLicenseUsable(license);

  return (
    <AuthContext.Provider
      value={{
        user: token ? (session?.user ?? null) : null,
        token,
        organization,
        license,
        licenseUsable,
        loading,
        dbError,
        isAuthenticated: Boolean(token && session?.user),
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
