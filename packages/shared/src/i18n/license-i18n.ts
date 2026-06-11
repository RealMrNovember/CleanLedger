import type { LicenseDeviceInfo, LicenseSnapshot } from "../license/types";
import { isLicenseUsable } from "../license/types";
import type { LicenseDisplay } from "../license/display";
import type { TranslateFn } from "./labels";

function formatLicenseDate(value: string, locale: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString(locale);
}

export function formatLocalizedLicenseDeviceSummary(
  t: TranslateFn,
  snapshot: LicenseSnapshot | null
): string {
  if (!snapshot) return "";
  const used = snapshot.registeredDevices ?? snapshot.devices?.length ?? 0;
  const max = snapshot.maxDevices;
  if (!max) return "";
  return t("license.devicesInUse", { used: String(used), max: String(max) });
}

export function formatLocalizedLicenseDeviceLabel(
  t: TranslateFn,
  device: LicenseDeviceInfo
): string {
  const platform =
    device.platform === "web"
      ? t("license.deviceWeb")
      : device.platform === "desktop"
        ? t("license.deviceDesktop")
        : t("license.deviceGeneric");
  const name = device.deviceName?.trim();
  if (name) return `${name} (${platform})`;
  return platform;
}

export function getLocalizedLicenseDisplay(
  t: TranslateFn,
  locale: string,
  snapshot: LicenseSnapshot | null
): LicenseDisplay {
  if (!snapshot) {
    return { label: t("license.none"), tone: "inactive" };
  }

  if (!isLicenseUsable(snapshot)) {
    const expired = formatLicenseDate(snapshot.expiresAt, locale);
    return {
      label: t("license.expired"),
      detail: expired
        ? t("license.validUntil", { date: expired })
        : undefined,
      tone: "inactive",
    };
  }

  switch (snapshot.type) {
    case "lifetime":
      return { label: t("license.lifetime"), tone: "lifetime" };
    case "trial": {
      const expires = formatLicenseDate(snapshot.expiresAt, locale);
      return {
        label: t("license.trial"),
        detail: expires
          ? t("license.validUntil", { date: expires })
          : undefined,
        tone: "trial",
      };
    }
    case "monthly":
      return {
        label: t("license.monthly"),
        detail: (() => {
          const expires = formatLicenseDate(snapshot.expiresAt, locale);
          return expires
            ? t("license.validUntil", { date: expires })
            : undefined;
        })(),
        tone: "full",
      };
    case "yearly":
      return {
        label: t("license.yearly"),
        detail: (() => {
          const expires = formatLicenseDate(snapshot.expiresAt, locale);
          return expires
            ? t("license.validUntil", { date: expires })
            : undefined;
        })(),
        tone: "full",
      };
    default:
      return {
        label: t("license.full"),
        detail: (() => {
          const expires = formatLicenseDate(snapshot.expiresAt, locale);
          return expires
            ? t("license.validUntil", { date: expires })
            : undefined;
        })(),
        tone: "full",
      };
  }
}

export function formatLocalizedLicenseDetail(
  t: TranslateFn,
  locale: string,
  snapshot: LicenseSnapshot | null
): string {
  const display = getLocalizedLicenseDisplay(t, locale, snapshot);
  const deviceSummary = formatLocalizedLicenseDeviceSummary(t, snapshot);
  if (display.detail) {
    return deviceSummary ? `${display.detail} · ${deviceSummary}` : display.detail;
  }
  if (display.tone === "lifetime") {
    return deviceSummary
      ? `${t("license.lifetimeActive")} ${deviceSummary}.`
      : t("license.lifetimeActive");
  }
  if (display.tone === "inactive") {
    return snapshot?.lockReason ?? t("license.inactiveDefault");
  }
  return deviceSummary
    ? `${t("license.active")} ${deviceSummary}.`
    : t("license.active");
}
