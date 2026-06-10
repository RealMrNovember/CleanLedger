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

import { appConfig } from "@/lib/config";

const AUTH_API_URL = appConfig.authApiUrl;
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

  let res: Response;
  try {
    res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Ağ bağlantısı kurulamadı.";
    throw new Error(`Auth API'ye ulaşılamadı: ${detail}`);
  }

  const raw = await res.text();
  let data: (T & { message?: string; code?: string }) | null = null;
  try {
    data = raw ? (JSON.parse(raw) as T & { message?: string; code?: string }) : null;
  } catch {
    throw new Error(
      `Auth API geçersiz yanıt döndü (HTTP ${res.status}). Sunucu JSON yerine HTML döndürmüş olabilir.`
    );
  }

  if (!res.ok) {
    const code = data?.code ? ` [${data.code}]` : "";
    throw new Error(
      (data?.message ?? "İstek başarısız.") + code
    );
  }

  if (!data) {
    throw new Error("Auth API boş yanıt döndü.");
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
    if (!res.token?.trim()) {
      throw new Error("Sunucu geçerli oturum anahtarı döndürmedi.");
    }
    return { token: res.token, user: res.user };
  } catch (err) {
    if (import.meta.env.PROD) {
      throw err instanceof Error
        ? err
        : new Error("Giriş başarısız. İnternet bağlantınızı kontrol edin.");
    }
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
    throw new Error(
      "Hesap bulunamadı. Sunucu üzerinden kayıt olduysanız tekrar deneyin."
    );
  }
  if (found.password !== currentPassword) {
    throw new Error("Mevcut şifre hatalı.");
  }
  found.password = newPassword;
  found.token = makeToken();
  saveLocalUsers(users);
  return { token: found.token, user: stripPassword(found) };
}

export async function changePasswordRemote(
  token: string,
  email: string,
  input: ChangePasswordInput
): Promise<AuthSession> {
  const { currentPassword, newPassword } = input;

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
    }>("change_password", {
      token,
      currentPassword,
      newPassword,
    });
    return { token: res.token, user: res.user };
  } catch (err) {
    if (import.meta.env.PROD) {
      throw err instanceof Error ? err : new Error("Şifre güncellenemedi.");
    }
    return changePasswordLocal(email, currentPassword, newPassword);
  }
}
