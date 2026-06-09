const BASE_URL = (
  import.meta.env.VITE_LICENSE_API_URL ?? "https://license.cicibyte.com"
).replace(/\/$/, "");

const APP_CODE = import.meta.env.VITE_LICENSE_APP_CODE ?? "cleanledger";
const API_KEY = import.meta.env.VITE_LICENSE_API_KEY ?? "";

export interface LicenseSnapshot {
  status: string;
  type: string;
  expiresAt: string;
  maxDevices: number;
  registeredDevices: number;
}

interface LicenseApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface LicenseServerData {
  status: string;
  type: string;
  expires_at: string;
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
    expiresAt: data.expires_at,
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

export async function startTrial(hwid: string): Promise<LicenseSnapshot> {
  const data = await postLicense<LicenseServerData>("trial", {
    app_code: APP_CODE,
    hwid,
  });
  return mapSnapshot(data);
}

export async function checkLicense(hwid: string): Promise<LicenseSnapshot> {
  const data = await postLicense<LicenseServerData>("check", {
    app_code: APP_CODE,
    hwid,
  });
  return mapSnapshot(data);
}

export function isLicenseUsable(snapshot: LicenseSnapshot): boolean {
  if (!["active", "trial"].includes(snapshot.status)) return false;
  const expires = new Date(snapshot.expiresAt).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

export function saveLicenseCache(snapshot: LicenseSnapshot): void {
  localStorage.setItem("cleanledger_license_cache", JSON.stringify(snapshot));
}

export function getLicenseCache(): LicenseSnapshot | null {
  try {
    const raw = localStorage.getItem("cleanledger_license_cache");
    if (!raw) return null;
    return JSON.parse(raw) as LicenseSnapshot;
  } catch {
    return null;
  }
}

export async function ensureLicense(hwid: string): Promise<LicenseSnapshot> {
  try {
    const snapshot = await checkLicense(hwid);
    saveLicenseCache(snapshot);
    return snapshot;
  } catch {
    const cached = getLicenseCache();
    if (cached && isLicenseUsable(cached)) return cached;
    const trial = await startTrial(hwid);
    saveLicenseCache(trial);
    return trial;
  }
}
