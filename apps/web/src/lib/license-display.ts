import type { LicenseSnapshot } from "@/lib/license-client";

export function isLifetimeLicense(snapshot: LicenseSnapshot): boolean {
  const type = snapshot.type?.toLowerCase() ?? "";
  if (type.includes("lifetime") || type.includes("perpetual") || type === "ömür") {
    return true;
  }
  const exp = new Date(snapshot.expiresAt).getTime();
  if (!Number.isFinite(exp)) return false;
  return exp >= new Date("2090-01-01").getTime();
}

export function formatLicenseBadge(snapshot: LicenseSnapshot | null): string {
  if (!snapshot) return "Lisans: —";
  if (isLifetimeLicense(snapshot)) return "Lisans: Ömür Boyu";
  if (snapshot.status === "trial" || snapshot.type?.toLowerCase() === "trial") {
    return "Lisans: Deneme Sürümü";
  }
  if (snapshot.status === "active") {
    const exp = new Date(snapshot.expiresAt);
    if (Number.isFinite(exp.getTime())) {
      return `Lisans: Aktif (${exp.toLocaleDateString("tr-TR")})`;
    }
    return "Lisans: Aktif";
  }
  return "Lisans: Pasif";
}

export function formatLicenseDetail(snapshot: LicenseSnapshot | null): string {
  if (!snapshot) return "Lisans bilgisi alınamadı.";
  if (isLifetimeLicense(snapshot)) {
    return "Ömür boyu lisansınız aktif.";
  }
  if (snapshot.status === "trial" || snapshot.type?.toLowerCase() === "trial") {
    const exp = new Date(snapshot.expiresAt);
    if (Number.isFinite(exp.getTime())) {
      return `Deneme sürümü — ${exp.toLocaleDateString("tr-TR")} tarihine kadar.`;
    }
    return "Deneme sürümü aktif.";
  }
  if (snapshot.status === "active") {
    const exp = new Date(snapshot.expiresAt);
    if (Number.isFinite(exp.getTime())) {
      return `Aktif lisans — ${exp.toLocaleDateString("tr-TR")} tarihine kadar.`;
    }
    return "Aktif lisans.";
  }
  return "Lisansınız aktif değil. Destek ile iletişime geçin.";
}
