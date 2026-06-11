/** Oturum kapatıldığında RAM/state temizliği için ortak olay adı */
export const SESSION_CLEARED_EVENT = "cleanledger-session-cleared";

export function dispatchSessionCleared(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
}
