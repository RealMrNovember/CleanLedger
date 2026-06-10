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

function parseWhatsAppWebUrl(url: string): { phone: string; text: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("wa.me")) return null;
    const phone = parsed.pathname.replace(/^\//, "").split("/")[0] ?? "";
    const text = parsed.searchParams.get("text") ?? "";
    if (!phone) return null;
    return { phone, text };
  } catch {
    return null;
  }
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** WhatsApp masaüstü uygulaması varsa onu açar; yoksa web WhatsApp'a yönlendirir. */
export async function openWhatsApp(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const { openUrl } = await import("@tauri-apps/plugin-opener");
  const parsed = parseWhatsAppWebUrl(url);

  if (parsed) {
    const appUrl = parsed.text
      ? `whatsapp://send?phone=${parsed.phone}&text=${encodeURIComponent(parsed.text)}`
      : `whatsapp://send?phone=${parsed.phone}`;
    try {
      await openUrl(appUrl);
      return;
    } catch {
      /* WhatsApp yüklü değil — web sürümüne düş */
    }
  }

  await openUrl(url);
}
