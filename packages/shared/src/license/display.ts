import type { LicenseSnapshot } from "./types";
import { isLicenseUsable } from "./types";
import { formatLicenseDeviceSummary } from "./api-mapper";

export interface LicenseDisplay {
  label: string;
  detail?: string;
  tone: "trial" | "full" | "lifetime" | "inactive";
}

export function isLifetimeLicense(snapshot: LicenseSnapshot): boolean {
  return snapshot.type === "lifetime" && isLicenseUsable(snapshot);
}

export function getLicenseDisplay(snapshot: LicenseSnapshot | null): LicenseDisplay {
  if (!snapshot) {
    return { label: "Lisans: Yok", tone: "inactive" };
  }

  if (!isLicenseUsable(snapshot)) {
    const expired = formatLicenseDate(snapshot.expiresAt);
    return {
      label: "Lisans: Süresi Doldu",
      detail: expired ? `Son geçerlilik: ${expired}` : undefined,
      tone: "inactive",
    };
  }

  switch (snapshot.type) {
    case "lifetime":
      return { label: "Lisans: Ömür Boyu", tone: "lifetime" };
    case "trial": {
      const expires = formatLicenseDate(snapshot.expiresAt);
      return {
        label: "Lisans: Deneme Sürümü",
        detail: expires ? `${expires} tarihine kadar` : undefined,
        tone: "trial",
      };
    }
    case "monthly":
      return {
        label: "Lisans: Aylık",
        detail: formatLicenseDate(snapshot.expiresAt)
          ? `${formatLicenseDate(snapshot.expiresAt)} tarihine kadar`
          : undefined,
        tone: "full",
      };
    case "yearly":
      return {
        label: "Lisans: Yıllık",
        detail: formatLicenseDate(snapshot.expiresAt)
          ? `${formatLicenseDate(snapshot.expiresAt)} tarihine kadar`
          : undefined,
        tone: "full",
      };
    default:
      return {
        label: "Lisans: Tam Sürüm",
        detail: formatLicenseDate(snapshot.expiresAt)
          ? `${formatLicenseDate(snapshot.expiresAt)} tarihine kadar`
          : undefined,
        tone: "full",
      };
  }
}

export function formatLicenseDetail(snapshot: LicenseSnapshot | null): string {
  const display = getLicenseDisplay(snapshot);
  const deviceSummary = formatLicenseDeviceSummary(snapshot);
  if (display.detail) {
    return deviceSummary ? `${display.detail} · ${deviceSummary}` : display.detail;
  }
  if (display.tone === "lifetime") {
    return deviceSummary
      ? `Ömür boyu lisansınız aktif. ${deviceSummary}.`
      : "Ömür boyu lisansınız aktif.";
  }
  if (display.tone === "inactive") {
    return snapshot?.lockReason ?? "Lisansınız aktif değil. Destek ile iletişime geçin.";
  }
  return deviceSummary
    ? `Lisansınız aktif. ${deviceSummary}.`
    : "Lisansınız aktif.";
}

function formatLicenseDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString("tr-TR");
}

export const licenseToneClasses: Record<LicenseDisplay["tone"], string> = {
  trial: "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100",
  full: "border-trust/30 bg-trust-light/60 text-trust dark:border-trust/40 dark:bg-trust/10 dark:text-trust",
  lifetime: "border-mint/40 bg-mint-light/70 text-[#0f5f57] dark:border-mint/30 dark:bg-teal-950/40 dark:text-teal-100",
  inactive: "border-border/60 bg-muted/40 text-muted-foreground",
};
