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

const SESSION_KEY = "cleanledger_session";
const LOCAL_USERS_KEY = "cleanledger_users_registry";

const API_BASE =
  import.meta.env.VITE_AUTH_API_URL ??
  (import.meta.env.PROD
    ? "https://cleanledger.cicibyte.com/api/auth.php"
    : "/api/auth.php");

type StoredUser = AuthUser & { password: string; token: string };

function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function getAuthUser(): AuthUser | null {
  return getSession()?.user ?? null;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

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
  method: "GET" | "POST",
  body?: Record<string, unknown>,
  token?: string
): Promise<T> {
  const url =
    method === "GET" && token
      ? `${API_BASE}?action=${action}&token=${encodeURIComponent(token)}`
      : `${API_BASE}?action=${action}`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });

  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? "İstek başarısız.");
  }
  return data;
}

async function signupLocal(input: SignupInput): Promise<AuthSession> {
  const email = input.email.trim().toLowerCase();
  const users = getLocalUsers();
  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("Bu e-posta zaten kayıtlı.");
  }
  const token = makeToken();
  const user: StoredUser = {
    email,
    companyName: input.companyName.trim(),
    ownerName: input.ownerName.trim(),
    phone: input.phone.trim(),
    city: input.city.trim(),
    password: input.password,
    token,
    trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
  };
  users.push(user);
  saveLocalUsers(users);
  const session = { token, user: stripPassword(user) };
  saveSession(session);
  return session;
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
  const session = { token: found.token, user: stripPassword(found) };
  saveSession(session);
  return session;
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

export async function signup(input: SignupInput): Promise<AuthSession> {
  try {
    const res = await apiRequest<{
      success: boolean;
      token: string;
      user: AuthUser;
    }>("signup", "POST", { ...input });
    const session = { token: res.token, user: res.user };
    saveSession(session);
    return session;
  } catch {
    return signupLocal(input);
  }
}

export async function login(
  email: string,
  password: string
): Promise<AuthSession> {
  try {
    const res = await apiRequest<{
      success: boolean;
      token: string;
      user: AuthUser;
    }>("login", "POST", { email, password });
    const session = { token: res.token, user: res.user };
    saveSession(session);
    return session;
  } catch (err) {
    if (err instanceof Error && err.message !== "İstek başarısız.") {
      throw err;
    }
    return loginLocal(email, password);
  }
}

export async function fetchProfile(token: string): Promise<AuthUser> {
  try {
    const res = await apiRequest<{ success: boolean; user: AuthUser }>(
      "profile",
      "GET",
      undefined,
      token
    );
    return res.user;
  } catch {
    const users = getLocalUsers();
    const found = users.find((u) => u.token === token);
    if (!found) throw new Error("Geçersiz oturum.");
    return stripPassword(found);
  }
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

async function changePasswordLocal(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<AuthSession> {
  const users = getLocalUsers();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!found) {
    throw new Error("Hesap bulunamadı. Sunucu üzerinden kayıt olduysanız tekrar deneyin.");
  }
  if (found.password !== currentPassword) {
    throw new Error("Mevcut şifre hatalı.");
  }
  found.password = newPassword;
  found.token = makeToken();
  saveLocalUsers(users);
  const session = { token: found.token, user: stripPassword(found) };
  saveSession(session);
  return session;
}

export async function changePassword(
  token: string,
  email: string,
  input: ChangePasswordInput
): Promise<AuthSession> {
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;

  if (!currentPassword || !newPassword) {
    throw new Error("Mevcut ve yeni şifre gerekli.");
  }
  if (newPassword.length < 6) {
    throw new Error("Yeni şifre en az 6 karakter olmalı.");
  }
  if (currentPassword === newPassword) {
    throw new Error("Yeni şifre mevcut şifreden farklı olmalı.");
  }

  try {
    const res = await apiRequest<{
      success: boolean;
      token: string;
      user: AuthUser;
    }>("change_password", "POST", {
      token,
      currentPassword,
      newPassword,
    });
    const session = { token: res.token, user: res.user };
    saveSession(session);
    return session;
  } catch (err) {
    if (
      err instanceof Error &&
      err.message !== "İstek başarısız." &&
      err.message !== "Geçersiz işlem."
    ) {
      throw err;
    }
    return changePasswordLocal(email, currentPassword, newPassword);
  }
}

/** Masaüstü uygulaması için export */
export const AUTH_API_URL = API_BASE;
