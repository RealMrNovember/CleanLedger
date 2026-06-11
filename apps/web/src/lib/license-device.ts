import type { LicensePlatform } from "@cleanledger/shared/license";

const DEVICE_NAME_KEY = "cleanledger_web_device_name";

export function getLicensePlatform(): LicensePlatform {
  return "web";
}

export function getDeviceName(): string {
  try {
    const stored = localStorage.getItem(DEVICE_NAME_KEY)?.trim();
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return "Web Tarayıcı";
}

export function setDeviceName(name: string): void {
  try {
    localStorage.setItem(DEVICE_NAME_KEY, name.trim());
  } catch {
    /* ignore */
  }
}
