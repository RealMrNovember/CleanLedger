const BASE_URL = (
  import.meta.env.VITE_LICENSE_API_URL ?? "https://license.cicibyte.com"
).replace(/\/$/, "");

const APP_CODE = import.meta.env.VITE_LICENSE_APP_CODE ?? "cleanledger";
const API_KEY = import.meta.env.VITE_LICENSE_API_KEY ?? "";

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
    throw new Error(parsed.message ?? `Lisans sunucusu hatası (${res.status})`);
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

  if (context?.email) body.email = context.email;
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

export function isLicenseUsable(snapshot: LicenseSnapshot): boolean {
  if (!["active", "trial"].includes(snapshot.status)) return false;
  if (snapshot.type === "lifetime") return true;
  if (!snapshot.expiresAt) return false;
  const expires = new Date(snapshot.expiresAt).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

export function saveLicenseCache(snapshot: LicenseSnapshot): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
}

export function getLicenseCache(): LicenseSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LicenseSnapshot;
  } catch {
    return null;
  }
}

export function clearLicenseCache(): void {
  localStorage.removeItem(CACHE_KEY);
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
  try {
    const snapshot = await checkLicense(hwid, context);
    saveLicenseCache(snapshot);
    return snapshot;
  } catch {
    const cached = getLicenseCache();
    if (cached && isLicenseUsable(cached)) return cached;

    try {
      const trial = await startTrial(hwid, context);
      saveLicenseCache(trial);
      return trial;
    } catch {
      if (cached) return cached;
      throw new Error("Lisans doğrulanamadı.");
    }
  }
}
