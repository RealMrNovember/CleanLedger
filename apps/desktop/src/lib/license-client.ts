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
import { appConfig } from "@/lib/config";

export type { LicenseSnapshot };

const BASE_URL = appConfig.licenseApiUrl;
const APP_CODE = appConfig.licenseAppCode;
const API_KEY = appConfig.licenseApiKey;
const DEV_MODE_TOKEN = "cleanledger-dev-bypass";

const CACHE_KEY = "cleanledger_license_cache";

export interface LicenseContext {
  email?: string;
  clientName?: string;
  organizationId?: string;
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
  code?: string;
}

export class LicenseApiError extends Error {
  readonly httpStatus: number;
  readonly responseBody?: unknown;
  readonly kind: "network" | "auth" | "not_found" | "forbidden" | "server" | "logic";

  constructor(
    message: string,
    httpStatus: number,
    kind: LicenseApiError["kind"],
    responseBody?: unknown
  ) {
    super(message);
    this.name = "LicenseApiError";
    this.httpStatus = httpStatus;
    this.kind = kind;
    this.responseBody = responseBody;
  }
}

function isDevelopmentMode(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === "development";
}

function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "(boş)";
  if (trimmed.length <= 6) return "***";
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-2)}`;
}

function licenseDebug(message: string, details?: Record<string, unknown>): void {
  const payload = details ? { ...details } : undefined;
  if (payload?.api_key) {
    payload.api_key = maskSecret(String(payload.api_key));
  }
  if (payload) {
    console.log(`[LICENSE DEBUG] ${message}`, payload);
  } else {
    console.log(`[LICENSE DEBUG] ${message}`);
  }
}

function classifyHttpError(status: number): LicenseApiError["kind"] {
  if (status === 401 || status === 403) return status === 401 ? "auth" : "forbidden";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "logic";
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

function createDevBypassSnapshot(context?: LicenseContext): LicenseSnapshot {
  licenseDebug("DEV bypass aktif — lisans sunucusu atlanıyor", {
    dev_mode_token: DEV_MODE_TOKEN,
    app_code: APP_CODE,
    email: context?.email ?? null,
    client_name: context?.clientName ?? null,
    organization_id: context?.organizationId ?? null,
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
  });
  return {
    status: "active",
    type: "dev",
    expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    maxDevices: 99,
    registeredDevices: 1,
    firmEmail: context?.email ?? null,
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

function logRequestPayload(
  path: "trial" | "check" | "activate",
  body: Record<string, unknown>
): void {
  licenseDebug(`POST ${path} isteği hazırlanıyor`, {
    url: endpoint(path),
    app_code: body.app_code,
    hwid: body.hwid,
    email: body.email ?? null,
    client_name: body.client_name ?? null,
    organization_id: body.organization_id ?? null,
    platform: body.platform ?? null,
    device_name: body.device_name ?? null,
    api_key: API_KEY,
    api_key_configured: Boolean(API_KEY.trim()),
  });
}

async function postLicense<T>(
  path: "trial" | "check" | "activate",
  body: Record<string, unknown>
): Promise<T> {
  logRequestPayload(path, body);

  let res: Response;
  try {
    res = await fetch(endpoint(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": API_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    licenseDebug("AĞ HATASI — istek sunucuya ulaşamadı", {
      path,
      error: detail,
      url: endpoint(path),
    });
    throw new LicenseApiError(
      `Lisans sunucusuna ulaşılamadı: ${detail}`,
      0,
      "network"
    );
  }

  const raw = await res.text();
  let parsed: LicenseApiEnvelope<T> | null = null;
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw) as LicenseApiEnvelope<T>;
    } catch {
      licenseDebug("YANIT HATASI — sunucu JSON döndürmedi", {
        path,
        http_status: res.status,
        raw_preview: raw.slice(0, 300),
      });
      throw new LicenseApiError(
        `Lisans sunucusu geçersiz yanıt döndürdü (${res.status})`,
        res.status,
        classifyHttpError(res.status),
        raw
      );
    }
  }

  if (!res.ok || !parsed?.success) {
    const kind = classifyHttpError(res.status);
    const message =
      parsed?.message ??
      (res.status === 401
        ? "Geçersiz veya eksik API anahtarı."
        : res.status === 404
          ? "Lisans kaydı bulunamadı."
          : `Lisans sunucusu hatası (${res.status})`);

    licenseDebug(
      kind === "auth" || kind === "not_found" || kind === "forbidden"
        ? "SUNUCU YANITI — istek ulaştı, veri/API reddedildi"
        : "SUNUCU HATASI",
      {
        path,
        http_status: res.status,
        kind,
        message,
        code: parsed?.code ?? null,
        app_code_sent: body.app_code,
        email_sent: body.email ?? null,
        organization_id_sent: body.organization_id ?? null,
        hwid_sent: body.hwid,
        response: parsed ?? raw,
      }
    );

    throw new LicenseApiError(message, res.status, kind, parsed ?? raw);
  }

  licenseDebug(`POST ${path} başarılı`, {
    http_status: res.status,
    status: (parsed.data as LicenseApiPayload | undefined)?.status,
    type: (parsed.data as LicenseApiPayload | undefined)?.type,
  });

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
  const resolved = resolveContext(context);
  const body = buildLicenseRequestBody(APP_CODE, hwid, resolved, extra);
  if (resolved.organizationId?.trim()) {
    body.organization_id = resolved.organizationId.trim().toLowerCase();
  }
  return body;
}

export async function startTrial(
  hwid: string,
  context?: LicenseContext
): Promise<LicenseSnapshot> {
  if (isDevelopmentMode()) return createDevBypassSnapshot(context);
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
  if (isDevelopmentMode()) return createDevBypassSnapshot(context);
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
  if (isDevelopmentMode()) return createDevBypassSnapshot(context);
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

  licenseDebug("ensureLicense başladı", {
    dev_mode: isDevelopmentMode(),
    app_code: APP_CODE,
    hwid,
    email: email ?? null,
    client_name: context?.clientName ?? null,
    organization_id: context?.organizationId ?? null,
    api_key_configured: Boolean(API_KEY.trim()),
  });

  if (isDevelopmentMode()) {
    const snapshot = createDevBypassSnapshot(context);
    saveLicenseCache(snapshot, email);
    return snapshot;
  }

  try {
    const snapshot = await checkLicense(hwid, context);
    saveLicenseCache(snapshot, email);
    return snapshot;
  } catch (err) {
    if (err instanceof LicenseApiError) {
      licenseDebug("ensureLicense hata sınıflandırması", {
        kind: err.kind,
        http_status: err.httpStatus,
        message: err.message,
      });

      if (err.httpStatus === 403) {
        const locked = withLicenseLockReason(expiredSnapshot(), err.message);
        saveLicenseCache(locked, email);
        return locked;
      }

      if (err.httpStatus === 404 && email) {
        licenseDebug("404 — trial başlatılıyor (email bazlı)", { email });
        const trial = await startTrial(hwid, context);
        saveLicenseCache(trial, email);
        return trial;
      }
    }

    const cached = getLicenseCache(email);
    if (cached && isLicenseUsable(cached)) {
      licenseDebug("önbellekten geçerli lisans kullanılıyor", { email });
      return cached;
    }

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
