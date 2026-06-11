import type { LicenseDeviceInfo, LicenseSnapshot } from "./types";

export interface LicenseApiDeviceRow {
  hwid: string;
  device_name?: string | null;
  platform?: string | null;
  last_seen_at?: string | null;
  is_blocked?: boolean;
  is_current?: boolean;
}

export interface LicenseApiPayload {
  status: string;
  type: string;
  expires_at?: string | null;
  max_devices: number;
  registered_devices: number;
  firm_email?: string | null;
  devices?: LicenseApiDeviceRow[];
}

export function mapLicenseApiPayload(data: LicenseApiPayload): LicenseSnapshot {
  const devices: LicenseDeviceInfo[] = (data.devices ?? []).map((device) => ({
    hwid: device.hwid,
    deviceName: device.device_name ?? null,
    platform:
      device.platform === "web" || device.platform === "desktop"
        ? device.platform
        : null,
    lastSeenAt: device.last_seen_at ?? null,
    isBlocked: Boolean(device.is_blocked),
    isCurrent: Boolean(device.is_current),
  }));

  return {
    status: data.status,
    type: data.type,
    expiresAt: data.expires_at ?? "",
    maxDevices: data.max_devices,
    registeredDevices: data.registered_devices,
    firmEmail: data.firm_email ?? null,
    devices,
  };
}

export function withLicenseLockReason(
  snapshot: LicenseSnapshot,
  lockReason: string | null
): LicenseSnapshot {
  return lockReason ? { ...snapshot, lockReason } : snapshot;
}

export function formatLicenseDeviceSummary(snapshot: LicenseSnapshot | null): string {
  if (!snapshot) return "";
  const used = snapshot.registeredDevices ?? snapshot.devices?.length ?? 0;
  const max = snapshot.maxDevices;
  if (!max) return "";
  return `${used} / ${max} cihaz kullanımda`;
}

export function formatLicenseDeviceLabel(device: LicenseDeviceInfo): string {
  const platform =
    device.platform === "web"
      ? "Web"
      : device.platform === "desktop"
        ? "Masaüstü"
        : "Cihaz";
  const name = device.deviceName?.trim();
  if (name) return `${name} (${platform})`;
  return platform;
}
