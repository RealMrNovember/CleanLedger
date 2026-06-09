export const WHATSAPP_SUPPORT_NUMBER = "905354895050";
export const WHATSAPP_SUPPORT_URL = `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}`;

export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  if (digits.length === 10) return `90${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhoneForWhatsApp(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildOrderReadyMessage(
  customerName: string,
  shopName = "Cicibyte CleanLedger"
): string {
  const name = customerName.trim() || "Müşterimiz";
  return `Sayın ${name}, kıyafetleriniz temizlendi, dükkanımıza bekleriz. - ${shopName}`;
}

export function buildDebtMessage(
  customerName: string,
  amount: number,
  shopName = "Cicibyte CleanLedger"
): string {
  const name = customerName.trim() || "Müşterimiz";
  const formatted = amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `Sayın ${name}, ${formatted} TL bakiye borcunuz bulunmaktadır. - ${shopName}`;
}

export function openWhatsApp(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
