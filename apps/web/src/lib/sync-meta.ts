import { buildOrgScopedStorageKey } from "@cleanledger/shared/tenant";

const SYNC_UPDATED_AT_BASE = "cleanledger_sync_updated_at";

function syncKeyForOrg(organizationId: string | null): string {
  if (!organizationId?.trim()) return SYNC_UPDATED_AT_BASE;
  return buildOrgScopedStorageKey(SYNC_UPDATED_AT_BASE, organizationId);
}

let activeSyncOrgId: string | null = null;

export function setSyncMetaOrganization(organizationId: string | null): void {
  activeSyncOrgId = organizationId?.trim().toLowerCase() || null;
}

export function getSyncUpdatedAt(organizationId?: string | null): string | null {
  const orgId = organizationId ?? activeSyncOrgId;
  try {
    return localStorage.getItem(syncKeyForOrg(orgId));
  } catch {
    return null;
  }
}

export function setSyncUpdatedAt(iso: string, organizationId?: string | null): void {
  const orgId = organizationId ?? activeSyncOrgId;
  localStorage.setItem(syncKeyForOrg(orgId), iso);
}

export function bumpSyncUpdatedAt(organizationId?: string | null): string {
  const iso = new Date().toISOString();
  setSyncUpdatedAt(iso, organizationId);
  return iso;
}

export function clearSyncUpdatedAt(organizationId?: string | null): void {
  const orgId = organizationId ?? activeSyncOrgId;
  localStorage.removeItem(syncKeyForOrg(orgId));
  if (!orgId) {
    localStorage.removeItem(SYNC_UPDATED_AT_BASE);
  }
}
