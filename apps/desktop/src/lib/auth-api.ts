import {
  buildPasswordResetWhatsAppUrl,
  PASSWORD_RESET_GENERIC_MESSAGE,
  validateResetPassword,
} from "@cleanledger/shared";
import { AppError, ErrorCodes } from "@cleanledger/shared/errors";

export {
  buildPasswordResetWhatsAppUrl,
  PASSWORD_RESET_GENERIC_MESSAGE,
  validateResetPassword,
};

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
  logoDataUrl?: string;
}

export class AuthApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
    this.status = status;
  }
}

const SESSION_KEY = "cleanledger_session";
const LOCAL_USERS_KEY = "cleanledger_users_registry";

/** Dev'de Vite proxy yok; varsayılan olarak canlı auth API kullanılır. */
const API_BASE =
  import.meta.env.VITE_AUTH_API_URL ??
  "https://cleanledger.cicibyte.com/api/auth.php";

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
      : method === "GET" && body?.token
        ? `${API_BASE}?action=${action}&token=${encodeURIComponent(String(body.token))}`
        : `${API_BASE}?action=${action}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Ağ bağlantısı kurulamadı.";
    throw new AuthApiError(`Auth API'ye ulaşılamadı: ${detail}`, "NETWORK_ERROR");
  }

  const raw = await res.text();
  let data: (T & { message?: string; code?: string }) | null = null;
  if (raw.trim()) {
    try {
      data = JSON.parse(raw) as T & { message?: string; code?: string };
    } catch {
      throw new AuthApiError(
        res.ok
          ? "Auth API geçersiz JSON yanıtı döndürdü."
          : `Auth API hatası (${res.status}): yanıt JSON değil.`,
        "INVALID_RESPONSE",
        res.status
      );
    }
  }
  if (!res.ok) {
    throw new AuthApiError(
      data?.message ?? `Auth API hatası (${res.status})`,
      data?.code ?? ErrorCodes.AUTH_REQUEST_FAILED,
      res.status
    );
  }
  if (!data) {
    throw new AuthApiError(
      "Auth API boş yanıt döndürdü.",
      "EMPTY_RESPONSE",
      res.status
    );
  }
  return data;
}

function isAuthFailure(err: unknown): boolean {
  if (!(err instanceof AuthApiError)) return false;
  return (
    err.code === "WRONG_PASSWORD" ||
    err.code === "USER_NOT_FOUND" ||
    err.code === "MISSING_FIELDS" ||
    err.code === "PASSWORD_HASH_MISSING"
  );
}

async function signupLocal(input: SignupInput): Promise<AuthSession> {
  const email = input.email.trim().toLowerCase();
  const users = getLocalUsers();
  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new AppError(ErrorCodes.EMAIL_EXISTS);
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
    throw new AppError(ErrorCodes.WRONG_CREDENTIALS);
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
    if (import.meta.env.PROD) {
      throw new AppError(ErrorCodes.SIGNUP_FAILED);
    }
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
    if (import.meta.env.PROD || isAuthFailure(err)) {
      throw err instanceof Error ? err : new AppError(ErrorCodes.LOGIN_FAILED);
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
    if (!found) throw new AppError(ErrorCodes.INVALID_SESSION);
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
    throw new AppError(ErrorCodes.ACCOUNT_NOT_FOUND);
  }
  if (found.password !== currentPassword) {
    throw new AppError(ErrorCodes.WRONG_CURRENT_PASSWORD);
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
    throw new AppError(ErrorCodes.PASSWORDS_REQUIRED);
  }
  if (newPassword.length < 6) {
    throw new AppError(ErrorCodes.PASSWORD_TOO_SHORT);
  }
  if (currentPassword === newPassword) {
    throw new AppError(ErrorCodes.PASSWORD_UNCHANGED);
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
      err instanceof AuthApiError &&
      err.code !== "NETWORK_ERROR" &&
      import.meta.env.PROD
    ) {
      throw err;
    }
    if (
      err instanceof Error &&
      err.message !== "İstek başarısız." &&
      err.message !== "Geçersiz işlem." &&
      !(err instanceof AuthApiError && err.code === "NETWORK_ERROR")
    ) {
      throw err;
    }
    return changePasswordLocal(email, currentPassword, newPassword);
  }
}

export async function requestPasswordReset(email: string): Promise<string> {
  const res = await apiRequest<{ success: boolean; message?: string }>(
    "forgot_password",
    "POST",
    { email: email.trim().toLowerCase() }
  );
  return res.message ?? PASSWORD_RESET_GENERIC_MESSAGE;
}

export async function validateResetToken(token: string): Promise<boolean> {
  try {
    await apiRequest<{ success: boolean; valid: boolean }>(
      "validate_reset_token",
      "GET",
      { token }
    );
    return true;
  } catch {
    return false;
  }
}

export async function resetPassword(
  token: string,
  password: string
): Promise<string> {
  const validationError = validateResetPassword(password);
  if (validationError) {
    throw new Error(validationError);
  }

  const res = await apiRequest<{ success: boolean; message?: string }>(
    "reset_password",
    "POST",
    { token, password }
  );
  return res.message ?? "Parolanız güncellendi.";
}

/** Masaüstü: yalnızca uzak API — yerel fallback yok. */
export async function loginRemote(
  email: string,
  password: string
): Promise<AuthSession> {
  const res = await apiRequest<{
    success: boolean;
    token: string;
    user: AuthUser;
  }>("login", "POST", { email, password });
  return { token: res.token, user: res.user };
}

export async function fetchProfileRemote(token: string): Promise<AuthUser> {
  const res = await apiRequest<{ success: boolean; user: AuthUser }>(
    "profile",
    "GET",
    undefined,
    token
  );
  return res.user;
}

export async function changePasswordRemote(
  token: string,
  _email: string,
  input: ChangePasswordInput
): Promise<AuthSession> {
  const res = await apiRequest<{
    success: boolean;
    token: string;
    user: AuthUser;
  }>("change_password", "POST", {
    token,
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
  });
  return { token: res.token, user: res.user };
}

/** Masaüstü uygulaması için export */
export const AUTH_API_URL = API_BASE;
