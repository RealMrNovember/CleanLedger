import { appConfig } from "@/lib/config";

const BASE_URL = appConfig.licenseApiUrl;
const APP_CODE = appConfig.licenseAppCode;
const API_KEY = appConfig.licenseApiKey;

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
    throw new Error(parsed?.message ?? `Lisans sunucusu hatası (${res.status})`);
  }
  if (!parsed.data) {
    throw new Error("Lisans sunucusu boş yanıt döndü.");
  }
  return parsed.data;
}

function createOfflineTrialSnapshot(): LicenseSnapshot {
  return {
    status: "trial",
    type: "trial",
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    maxDevices: 99,
    registeredDevices: 1,
  };
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
    try {
      const trial = await startTrial(hwid);
      saveLicenseCache(trial);
      return trial;
    } catch {
      const offline = createOfflineTrialSnapshot();
      saveLicenseCache(offline);
      return offline;
    }
  }
}
