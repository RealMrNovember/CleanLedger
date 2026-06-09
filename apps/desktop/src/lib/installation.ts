const INSTALLATION_KEY = "cleanledger_installation_id";

export function getInstallationId(): string {
  try {
    const existing = localStorage.getItem(INSTALLATION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(INSTALLATION_KEY, id);
    return id;
  } catch {
    return "cleanledger-local-fallback";
  }
}
