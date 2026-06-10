import type { LicenseSnapshot } from "@/lib/license-client";
import { isLicenseUsable } from "@/lib/license-client";

export interface LicenseDisplay {
  label: string;
  detail?: string;
  tone: "trial" | "full" | "lifetime" | "inactive";
}

export function getLicenseDisplay(snapshot: LicenseSnapshot | null): LicenseDisplay {
  if (!snapshot) {
    return { label: "Lisans: Yok", tone: "inactive" };
  }

  if (!isLicenseUsable(snapshot)) {
    const expired = formatDate(snapshot.expiresAt);
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
      const expires = formatDate(snapshot.expiresAt);
      return {
        label: "Lisans: Deneme Sürümü",
        detail: expires ? `${expires} tarihine kadar` : undefined,
        tone: "trial",
      };
    }
    case "monthly":
      return {
        label: "Lisans: Aylık",
        detail: formatDate(snapshot.expiresAt)
          ? `${formatDate(snapshot.expiresAt)} tarihine kadar`
          : undefined,
        tone: "full",
      };
    case "yearly":
      return {
        label: "Lisans: Yıllık",
        detail: formatDate(snapshot.expiresAt)
          ? `${formatDate(snapshot.expiresAt)} tarihine kadar`
          : undefined,
        tone: "full",
      };
    default:
      return {
        label: "Lisans: Tam Sürüm",
        detail: formatDate(snapshot.expiresAt)
          ? `${formatDate(snapshot.expiresAt)} tarihine kadar`
          : undefined,
        tone: "full",
      };
  }
}

function formatDate(value: string): string | null {
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
