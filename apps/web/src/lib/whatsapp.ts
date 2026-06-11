export {
  WHATSAPP_SUPPORT_NUMBER,
  WHATSAPP_SUPPORT_URL,
  normalizePhoneForWhatsApp,
  buildWhatsAppUrl,
  buildOrderReadyMessage,
  buildDebtMessage,
} from "@cleanledger/shared/whatsapp";

export function openWhatsApp(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
