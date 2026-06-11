export type LicensePlatform = "web" | "desktop";

export interface LicenseDeviceInfo {
  hwid: string;
  deviceName: string | null;
  platform: LicensePlatform | null;
  lastSeenAt: string | null;
  isBlocked?: boolean;
  isCurrent?: boolean;
}

export interface LicenseSnapshot {
  status: string;
  type: string;
  expiresAt: string;
  maxDevices: number;
  registeredDevices: number;
  firmEmail?: string | null;
  devices?: LicenseDeviceInfo[];
  /** İstemci tarafında kilit nedeni (API/cache) */
  lockReason?: string | null;
}

export function isLicenseUsable(snapshot: LicenseSnapshot | null): boolean {
  if (!snapshot) return false;
  if (snapshot.lockReason) return false;
  if (!["active", "trial"].includes(snapshot.status)) return false;
  if (snapshot.type === "dev") return true;
  if (snapshot.type === "lifetime") return true;
  if (!snapshot.expiresAt) return false;
  const expires = new Date(snapshot.expiresAt).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

export function isDeviceLimitError(message: string): boolean {
  return /cihaz limiti/i.test(message);
}
