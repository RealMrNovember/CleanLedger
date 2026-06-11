export type ThermalWidthProfile = "58" | "80";

const STORAGE_KEY = "cleanledger_thermal_width";
const PORT_STORAGE_KEY = "cleanledger_thermal_port";

export function getThermalWidthProfile(): ThermalWidthProfile {
  try {
    return localStorage.getItem(STORAGE_KEY) === "58" ? "58" : "80";
  } catch {
    return "80";
  }
}

export function setThermalWidthProfile(profile: ThermalWidthProfile): void {
  localStorage.setItem(STORAGE_KEY, profile);
}

export function thermalWidthToCss(profile: ThermalWidthProfile): "58mm" | "80mm" {
  return profile === "58" ? "58mm" : "80mm";
}

export function thermalReceiptWidthPx(profile: ThermalWidthProfile): number {
  return profile === "58" ? 220 : 300;
}

export function getThermalPort(): string {
  try {
    return localStorage.getItem(PORT_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setThermalPort(port: string): void {
  localStorage.setItem(PORT_STORAGE_KEY, port.trim());
}
