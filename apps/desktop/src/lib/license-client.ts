import { appConfig } from "@/lib/config";

const BASE_URL = appConfig.licenseApiUrl;
const APP_CODE = appConfig.licenseAppCode;
const API_KEY = appConfig.licenseApiKey;

const CACHE_KEY = "cleanledger_license_cache";

export interface LicenseSnapshot {
  status: string;
  type: string;
  expiresAt: string;
  maxDevices: number;
  registeredDevices: number;
}

export interface LicenseContext {
  email?: string;
  clientName?: string;
}

interface LicenseCacheEntry {
  email: string;
  snapshot: LicenseSnapshot;
}

interface LicenseApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface LicenseServerData {
  status: string;
  type: string;
  expires_at: string | null;
  max_devices: number;
  registered_devices: number;
}

export class LicenseApiError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "LicenseApiError";
    this.httpStatus = httpStatus;
  }
}

function normalizeEmail(email?: string): string | undefined {
  const normalized = email?.trim().toLowerCase();
  return normalized || undefined;
}

function endpoint(path: "trial" | "check" | "activate"): string {
  return `${BASE_URL}/api/v1/license/${path}`;
}

function mapSnapshot(data: LicenseServerData): LicenseSnapshot {
  return {
    status: data.status,
    type: data.type,
    expiresAt: data.expires_at ?? "",
    maxDevices: data.max_devices,
    registeredDevices: data.registered_devices,
  };
}

function expiredSnapshot(type = "trial"): LicenseSnapshot {
  return {
    status: "expired",
    type,
    expiresAt: new Date(0).toISOString(),
    maxDevices: 0,
    registeredDevices: 0,
  };
}

async function postLicense<T>(
  path: "trial" | "check" | "activate",
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(endpoint(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let parsed: LicenseApiEnvelope<T> | null = null;
  try {
    parsed = raw ? (JSON.parse(raw) as LicenseApiEnvelope<T>) : null;
  } catch {
    throw new Error(
      `Lisans sunucusu geçersiz yanıt döndü (HTTP ${res.status}).`
    );
  }

  if (!parsed || !res.ok || !parsed.success) {
    throw new LicenseApiError(
      parsed?.message ?? `Lisans sunucusu hatası (${res.status})`,
      res.status
    );
  }
  if (!parsed.data) {
    throw new Error("Lisans sunucusu boş yanıt döndü.");
  }
  return parsed.data;
}

function buildBody(
  hwid: string,
  context?: LicenseContext
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    app_code: APP_CODE,
    hwid,
  };

  const email = normalizeEmail(context?.email);
  if (email) body.email = email;
  if (context?.clientName) body.client_name = context.clientName;

  return body;
}

export async function startTrial(
  hwid: string,
  context?: LicenseContext
): Promise<LicenseSnapshot> {
  const data = await postLicense<LicenseServerData>(
    "trial",
    buildBody(hwid, context)
  );
  return mapSnapshot(data);
}

export async function checkLicense(
  hwid: string,
  context?: LicenseContext
): Promise<LicenseSnapshot> {
  const data = await postLicense<LicenseServerData>(
    "check",
    buildBody(hwid, context)
  );
  return mapSnapshot(data);
}

export function isLicenseUsable(snapshot: LicenseSnapshot | null): boolean {
  if (!snapshot) return false;
  if (!["active", "trial"].includes(snapshot.status)) return false;
  if (snapshot.type === "lifetime") return true;
  if (!snapshot.expiresAt) return false;
  const expires = new Date(snapshot.expiresAt).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

export function saveLicenseCache(
  snapshot: LicenseSnapshot,
  email?: string
): void {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    localStorage.removeItem(CACHE_KEY);
    return;
  }

  const entry: LicenseCacheEntry = { email: normalizedEmail, snapshot };
  localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
}

export function getLicenseCache(email?: string): LicenseSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as LicenseCacheEntry | LicenseSnapshot;
    const normalizedEmail = normalizeEmail(email);

    if ("snapshot" in parsed && "email" in parsed) {
      if (normalizedEmail && parsed.email !== normalizedEmail) return null;
      return parsed.snapshot;
    }

    if (normalizedEmail) return null;

    return parsed as LicenseSnapshot;
  } catch {
    return null;
  }
}

export function clearLicenseCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

export function purgeStaleLicenseCache(email?: string): void {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    clearLicenseCache();
    return;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as LicenseCacheEntry | LicenseSnapshot;
    if (!("email" in parsed) || parsed.email !== normalizedEmail) {
      clearLicenseCache();
    }
  } catch {
    clearLicenseCache();
  }
}

export async function ensureLicense(
  hwid: string,
  context?: LicenseContext
): Promise<LicenseSnapshot> {
  const email = normalizeEmail(context?.email);
  purgeStaleLicenseCache(email);

  try {
    const snapshot = await checkLicense(hwid, context);
    saveLicenseCache(snapshot, email);
    return snapshot;
  } catch (err) {
    if (err instanceof LicenseApiError) {
      if (err.httpStatus === 403) {
        const locked = expiredSnapshot();
        saveLicenseCache(locked, email);
        return locked;
      }

      if (err.httpStatus === 404 && email) {
        const trial = await startTrial(hwid, context);
        saveLicenseCache(trial, email);
        return trial;
      }
    }

    const cached = getLicenseCache(email);
    if (cached) return cached;

    if (email) {
      const locked = expiredSnapshot();
      saveLicenseCache(locked, email);
      return locked;
    }

    throw new Error("Lisans doğrulanamadı.");
  }
}
