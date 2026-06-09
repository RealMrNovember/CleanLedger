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
import {
  initDatabase,
  saveOrganizationSettings,
  getOrganizationSettings,
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

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  organization: OrganizationSettings | null;
  loading: boolean;
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
        const org = await getOrganizationSettings();
        if (saved && org?.authToken) {
          setSession(saved);
          setOrganization(org);
        } else if (saved) {
          const synced = await syncOrganization(saved);
          setSession(saved);
          setOrganization(synced);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginRemote(email, password);
    persistSession(next);
    const org = await syncOrganization(next);
    setSession(next);
    setOrganization(org);
  }, []);

  const logout = useCallback(async () => {
    persistSession(null);
    await clearOrganizationSettings();
    setSession(null);
    setOrganization(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        organization,
        loading,
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
