const SYNC_UPDATED_AT_KEY = "cleanledger_sync_updated_at";

export function getSyncUpdatedAt(): string | null {
  try {
    return localStorage.getItem(SYNC_UPDATED_AT_KEY);
  } catch {
    return null;
  }
}

export function setSyncUpdatedAt(iso: string): void {
  localStorage.setItem(SYNC_UPDATED_AT_KEY, iso);
}

export function bumpSyncUpdatedAt(): string {
  const iso = new Date().toISOString();
  setSyncUpdatedAt(iso);
  return iso;
}

export function clearSyncUpdatedAt(): void {
  localStorage.removeItem(SYNC_UPDATED_AT_KEY);
}
