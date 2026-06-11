import type { LocalDb } from "../schema/local-db";
import { normalizeOrganizationId } from "../organization/profile";

export const ACTIVE_TENANT_SESSION_KEY = "cleanledger_active_tenant";

export function buildOrgScopedStorageKey(
  baseKey: string,
  organizationId: string
): string {
  const normalized = normalizeOrganizationId(organizationId);
  if (!normalized) return baseKey;
  return `${baseKey}:${encodeURIComponent(normalized)}`;
}

export function tenantFromStorageKey(
  baseKey: string,
  storageKey: string
): string | null {
  const prefix = `${baseKey}:`;
  if (!storageKey.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(storageKey.slice(prefix.length));
  } catch {
    return storageKey.slice(prefix.length);
  }
}

function normalizeTenantId(tenantId: string): string {
  return normalizeOrganizationId(tenantId);
}

function entityMatchesTenant(
  entityOrgId: string | null | undefined,
  tenantId: string,
  allowLegacyUnscoped: boolean
): boolean {
  const tenant = normalizeTenantId(tenantId);
  const oid = entityOrgId?.trim().toLowerCase() || null;
  if (!oid) return allowLegacyUnscoped;
  return oid === tenant;
}

type ScopedEntity = { organizationId?: string | null };

function filterEntities<T extends ScopedEntity>(
  items: T[],
  tenantId: string,
  allowLegacyUnscoped: boolean
): T[] {
  return items.filter((item) =>
    entityMatchesTenant(item.organizationId, tenantId, allowLegacyUnscoped)
  );
}

function backfillTenantId<T extends ScopedEntity>(
  items: T[],
  tenantId: string
): T[] {
  const tenant = normalizeTenantId(tenantId);
  return items.map((item) => ({
    ...item,
    organizationId: item.organizationId?.trim() || tenant,
  }));
}

/** Yerel snapshot'tan yalnızca aktif kiracıya ait kayıtları bırakır. */
export function isolateLocalDbForTenant(db: LocalDb, tenantId: string): LocalDb {
  const tenant = normalizeTenantId(tenantId);
  const profileOrg = db.organizationProfile?.organizationId
    ?.trim()
    .toLowerCase();
  const allowLegacyUnscoped = !profileOrg || profileOrg === tenant;

  const isolated: LocalDb = {
    ...db,
    products: backfillTenantId(
      filterEntities(db.products, tenant, allowLegacyUnscoped),
      tenant
    ),
    customers: backfillTenantId(
      filterEntities(db.customers, tenant, allowLegacyUnscoped),
      tenant
    ),
    customerTags: backfillTenantId(
      filterEntities(db.customerTags, tenant, allowLegacyUnscoped),
      tenant
    ),
    coupons: backfillTenantId(
      filterEntities(db.coupons, tenant, allowLegacyUnscoped),
      tenant
    ),
    servicePrices: backfillTenantId(
      filterEntities(db.servicePrices, tenant, allowLegacyUnscoped),
      tenant
    ),
    orders: backfillTenantId(
      filterEntities(db.orders, tenant, allowLegacyUnscoped),
      tenant
    ),
    orderItems: backfillTenantId(
      filterEntities(db.orderItems, tenant, allowLegacyUnscoped),
      tenant
    ),
    orderPayments: backfillTenantId(
      filterEntities(db.orderPayments, tenant, allowLegacyUnscoped),
      tenant
    ),
    creditLedger: backfillTenantId(
      filterEntities(db.creditLedger, tenant, allowLegacyUnscoped),
      tenant
    ),
    creditResets: backfillTenantId(
      filterEntities(db.creditResets, tenant, allowLegacyUnscoped),
      tenant
    ),
    auditLog: backfillTenantId(
      filterEntities(db.auditLog, tenant, allowLegacyUnscoped),
      tenant
    ),
    whatsappTemplates: backfillTenantId(
      filterEntities(db.whatsappTemplates, tenant, allowLegacyUnscoped),
      tenant
    ),
    syncQueue: filterEntities(db.syncQueue, tenant, allowLegacyUnscoped),
    orderNumberSequences: backfillTenantId(
      filterEntities(db.orderNumberSequences ?? [], tenant, allowLegacyUnscoped),
      tenant
    ),
  };

  if (db.organizationProfile) {
    const orgMatches = entityMatchesTenant(
      db.organizationProfile.organizationId,
      tenant,
      allowLegacyUnscoped
    );
    isolated.organizationProfile = orgMatches
      ? {
          ...db.organizationProfile,
          organizationId: tenant,
          email: db.organizationProfile.email || tenant,
        }
      : null;
  }

  return isolated;
}

export function resolveTenantWebStorageKey(
  baseKey: string,
  organizationEmail: string,
  storage: {
    read: (key: string) => string | null;
    write: (key: string, value: string) => void;
  }
): string {
  const tenantId = normalizeOrganizationId(organizationEmail);
  const orgKey = buildOrgScopedStorageKey(baseKey, tenantId);

  if (storage.read(orgKey)) {
    return orgKey;
  }

  const legacyRaw = storage.read(baseKey);
  if (legacyRaw) {
    try {
      const parsed = JSON.parse(legacyRaw) as LocalDb;
      const legacyOrg = parsed.organizationProfile?.organizationId
        ?.trim()
        .toLowerCase();
      if (legacyOrg === tenantId) {
        storage.write(orgKey, legacyRaw);
        return orgKey;
      }
    } catch {
      /* yeni kiracı için boş DB */
    }
  }

  return orgKey;
}

export function entityBelongsToTenant(
  entity: ScopedEntity,
  tenantId: string
): boolean {
  const tenant = normalizeTenantId(tenantId);
  const oid = entity.organizationId?.trim().toLowerCase();
  if (!oid) return false;
  return oid === tenant;
}
