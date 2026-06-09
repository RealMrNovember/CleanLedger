export interface AuthUser {
  email: string;
  companyName: string;
  ownerName: string;
  phone: string;
  city: string;
  trialEndsAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface SignupInput {
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  password: string;
}

const AUTH_API_URL = "https://cleanledger.cicibyte.com/api/auth.php";
const LOCAL_USERS_KEY = "cleanledger_desktop_users";

type StoredUser = AuthUser & { password: string; token: string };

function getLocalUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: StoredUser[]): void {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function makeToken(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function apiRequest<T>(
  action: string,
  body?: Record<string, unknown>,
  token?: string
): Promise<T> {
  const url = token
    ? `${AUTH_API_URL}?action=${action}&token=${encodeURIComponent(token)}`
    : `${AUTH_API_URL}?action=${action}`;

  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? "İstek başarısız.");
  }
  return data;
}

function stripPassword(u: StoredUser): AuthUser {
  return {
    email: u.email,
    companyName: u.companyName,
    ownerName: u.ownerName,
    phone: u.phone,
    city: u.city,
    trialEndsAt: u.trialEndsAt,
  };
}

async function loginLocal(
  email: string,
  password: string
): Promise<AuthSession> {
  const users = getLocalUsers();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!found || found.password !== password) {
    throw new Error("E-posta veya şifre hatalı.");
  }
  found.token = makeToken();
  saveLocalUsers(users);
  return { token: found.token, user: stripPassword(found) };
}

export async function loginRemote(
  email: string,
  password: string
): Promise<AuthSession> {
  try {
    const res = await apiRequest<{
      success: boolean;
      token: string;
      user: AuthUser;
    }>("login", { email, password });
    return { token: res.token, user: res.user };
  } catch {
    return loginLocal(email, password);
  }
}

export async function signupRemote(input: SignupInput): Promise<AuthSession> {
  try {
    const res = await apiRequest<{
      success: boolean;
      token: string;
      user: AuthUser;
    }>("signup", { ...input });
    return { token: res.token, user: res.user };
  } catch (err) {
    throw err instanceof Error ? err : new Error("Kayıt başarısız.");
  }
}

export async function fetchProfileRemote(token: string): Promise<AuthUser> {
  const res = await apiRequest<{ success: boolean; user: AuthUser }>(
    "profile",
    undefined,
    token
  );
  return res.user;
}
