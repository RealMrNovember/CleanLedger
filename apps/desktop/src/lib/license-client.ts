const BASE_URL = (
  import.meta.env.VITE_LICENSE_API_URL ?? "https://license.cicibyte.com"
).replace(/\/$/, "");

const APP_CODE = import.meta.env.VITE_LICENSE_APP_CODE ?? "cleanledger";
const API_KEY = import.meta.env.VITE_LICENSE_API_KEY ?? "";

import type {
  LicenseApiPayload,
  LicensePlatform,
  LicenseSnapshot,
} from "@cleanledger/shared/license";
import {
  isLicenseUsable as sharedIsLicenseUsable,
  mapLicenseApiPayload,
  withLicenseLockReason,
  buildLicenseRequestBody,
} from "@cleanledger/shared/license";
import { getDeviceName, getLicensePlatform } from "@/lib/license-device";
import { AppError, ErrorCodes } from "@cleanledger/shared/errors";

export type { LicenseSnapshot };

const CACHE_KEY = "cleanledger_license_cache";

export interface LicenseContext {
  email?: string;
  clientName?: string;
  deviceName?: string;
  platform?: LicensePlatform;
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

function expiredSnapshot(type = "trial"): LicenseSnapshot {
  return {
    status: "expired",
    type,
    expiresAt: new Date(0).toISOString(),
    maxDevices: 0,
    registeredDevices: 0,
    devices: [],
  };
}

function resolveContext(context?: LicenseContext): LicenseContext {
  return {
    ...context,
    deviceName: context?.deviceName ?? getDeviceName(),
    platform: context?.platform ?? getLicensePlatform(),
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

  const parsed = (await res.json()) as LicenseApiEnvelope<T>;
  if (!res.ok || !parsed.success) {
    throw new LicenseApiError(
      parsed.message ?? `Lisans sunucusu hatası (${res.status})`,
      res.status
    );
  }
  if (!parsed.data) {
    throw new AppError(ErrorCodes.LICENSE_EMPTY_RESPONSE);
  }
  return parsed.data;
}

function buildBody(
  hwid: string,
  context?: LicenseContext,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return buildLicenseRequestBody(APP_CODE, hwid, resolveContext(context), extra);
}

export async function startTrial(
  hwid: string,
  context?: LicenseContext
): Promise<LicenseSnapshot> {
  const data = await postLicense<LicenseApiPayload>(
    "trial",
    buildBody(hwid, context)
  );
  return mapLicenseApiPayload(data);
}

export async function checkLicense(
  hwid: string,
  context?: LicenseContext
): Promise<LicenseSnapshot> {
  const data = await postLicense<LicenseApiPayload>(
    "check",
    buildBody(hwid, context)
  );
  return mapLicenseApiPayload(data);
}

export async function activateLicense(
  hwid: string,
  licenseKey: string,
  context?: LicenseContext
): Promise<LicenseSnapshot> {
  const data = await postLicense<LicenseApiPayload>("activate", {
    ...buildBody(hwid, context),
    license_key: licenseKey.trim(),
  });
  return mapLicenseApiPayload(data);
}

export const isLicenseUsable = sharedIsLicenseUsable;

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

export function getInstallationId(): string {
  const key = "cleanledger_web_installation_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return "cleanledger-web-fallback";
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
        const locked = withLicenseLockReason(expiredSnapshot(), err.message);
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
    if (cached && isLicenseUsable(cached)) return cached;

    if (email) {
      const message =
        err instanceof Error ? err.message : "Lisans doğrulanamadı.";
      const locked = withLicenseLockReason(expiredSnapshot(), message);
      saveLicenseCache(locked, email);
      return locked;
    }

    throw new AppError(ErrorCodes.LICENSE_VERIFY_FAILED);
  }
}
