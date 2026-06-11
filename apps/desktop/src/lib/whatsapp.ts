export {
  WHATSAPP_SUPPORT_NUMBER,
  WHATSAPP_SUPPORT_URL,
  normalizePhoneForWhatsApp,
  buildWhatsAppUrl,
  buildOrderReadyMessage,
  buildDebtMessage,
} from "@cleanledger/shared/whatsapp";

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
