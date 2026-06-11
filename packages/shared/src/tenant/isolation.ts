import type { LocalDb } from "../schema/local-db";
import { normalizeOrganizationId } from "../organization/profile";

export const ACTIVE_TENANT_SESSION_KEY = "cleanledger_active_tenant";
export const LEGACY_WEB_DB_MIGRATION_FLAG = "cleanledger_legacy_db_split_v1";

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

type ScopedEntity = { organizationId?: string | null };

/** Legacy tek-dosya snapshot bu firmaya ait mi? (e-posta veya organizationId) */
export function tenantOwnsLegacyDb(db: LocalDb, tenantId: string): boolean {
  const tenant = normalizeTenantId(tenantId);
  const profile = db.organizationProfile;
  if (!profile) return false;

  const org = profile.organizationId?.trim().toLowerCase() || "";
  const email = profile.email?.trim().toLowerCase() || "";

  if (org === tenant || email === tenant) return true;

  // Eski kayıtlar: profil e-postası shopProfile'dan gelmiş olabilir
  if (!org && email === tenant) return true;

  return false;
}

export function hasBusinessData(db: LocalDb): boolean {
  return (
    (db.customers?.length ?? 0) > 0 ||
    (db.orders?.length ?? 0) > 0 ||
    (db.products?.length ?? 0) > 1
  );
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

/** Legacy org'sız kayıtlar yalnızca profil e-postası/org eşleşen kiracıya verilir. */
function allowLegacyUnscopedForTenant(db: LocalDb, tenantId: string): boolean {
  return tenantOwnsLegacyDb(db, tenantId);
}

/** Legacy veya birleşik snapshot'tan yalnızca bir firmaya ait kayıtları ayırır. */
export function extractTenantDbFromLegacy(
  legacy: LocalDb,
  tenantId: string
): LocalDb {
  return isolateLocalDbForTenant(legacy, tenantId);
}

/** Yerel snapshot'tan yalnızca aktif kiracıya ait kayıtları bırakır. */
export function isolateLocalDbForTenant(db: LocalDb, tenantId: string): LocalDb {
  const tenant = normalizeTenantId(tenantId);
  const allowLegacyUnscoped = allowLegacyUnscopedForTenant(db, tenantId);

  const orders = backfillTenantId(
    filterEntities(db.orders, tenant, allowLegacyUnscoped),
    tenant
  );
  const orderIds = new Set(orders.map((o) => o.id));

  const isolated: LocalDb = {
    ...db,
    schemaVersion: db.schemaVersion,
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
    orders,
    orderItems: backfillTenantId(
      db.orderItems.filter(
        (item) =>
          entityMatchesTenant(item.organizationId, tenant, allowLegacyUnscoped) &&
          orderIds.has(item.orderId)
      ),
      tenant
    ),
    orderPayments: backfillTenantId(
      db.orderPayments.filter(
        (p) =>
          entityMatchesTenant(p.organizationId, tenant, allowLegacyUnscoped) &&
          orderIds.has(p.orderId)
      ),
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
    productColorPalette: db.productColorPalette,
    nextProductId: db.nextProductId,
    nextCustomerId: db.nextCustomerId,
    nextCustomerTagId: db.nextCustomerTagId,
    nextCouponId: db.nextCouponId,
    nextServicePriceId: db.nextServicePriceId,
    nextOrderId: db.nextOrderId,
    nextOrderItemId: db.nextOrderItemId,
    nextOrderPaymentId: db.nextOrderPaymentId,
    nextOrderNumber: db.nextOrderNumber,
    nextCreditLedgerId: db.nextCreditLedgerId,
    nextCreditResetId: db.nextCreditResetId,
    nextAuditLogId: db.nextAuditLogId,
    nextWhatsappTemplateId: db.nextWhatsappTemplateId,
  };

  if (db.organizationProfile) {
    const orgMatches = entityMatchesTenant(
      db.organizationProfile.organizationId,
      tenant,
      allowLegacyUnscoped
    );
    const emailMatches =
      db.organizationProfile.email?.trim().toLowerCase() === tenant;
    isolated.organizationProfile =
      orgMatches || emailMatches || tenantOwnsLegacyDb(db, tenant)
        ? {
            ...db.organizationProfile,
            organizationId: tenant,
            email: db.organizationProfile.email?.trim() || tenant,
          }
        : null;
  } else if (tenantOwnsLegacyDb(db, tenant) || hasBusinessData(isolateLocalDbForTenantCheckOnly(db, tenant))) {
    isolated.organizationProfile = {
      id: 1,
      globalId: null,
      organizationId: tenant,
      companyName: "",
      adminName: "",
      email: tenant,
      phone: "",
      address: "",
      logoDataUrl: null,
      logoHash: null,
      authToken: "",
      trialEndsAt: "",
      updatedAt: new Date().toISOString(),
    };
  }

  return isolated;
}

/** allowLegacyUnscoped hesabı için hafif kontrol (sonsuz özyineleme yok). */
function isolateLocalDbForTenantCheckOnly(
  db: LocalDb,
  tenantId: string
): LocalDb {
  const allowLegacyUnscoped = allowLegacyUnscopedForTenant(db, tenantId);
  return {
    ...db,
    customers: filterEntities(db.customers, tenantId, allowLegacyUnscoped),
    orders: filterEntities(db.orders, tenantId, allowLegacyUnscoped),
  };
}

export interface TenantWebStorage {
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
}

/**
 * Org-scoped anahtar yoksa veya boşsa legacy global snapshot'tan firmaya özel DB oluşturur.
 * Legacy dosya silinmez — diğer firmalar da kendi anahtarlarına taşınabilir.
 */
export function bootstrapTenantWebStorage(
  baseKey: string,
  organizationEmail: string,
  storage: TenantWebStorage,
  parseDb: (raw: string) => LocalDb,
  serializeDb: (db: LocalDb) => string
): string {
  const tenantId = normalizeOrganizationId(organizationEmail);
  const orgKey = buildOrgScopedStorageKey(baseKey, tenantId);

  const existingRaw = storage.read(orgKey);
  if (existingRaw) {
    try {
      const existing = parseDb(existingRaw);
      if (hasBusinessData(existing)) {
        return orgKey;
      }
    } catch {
      /* bozuk snapshot — legacy'den yeniden dene */
    }
  }

  const legacyRaw = storage.read(baseKey);
  if (legacyRaw) {
    try {
      const legacy = parseDb(legacyRaw);
      const slice = extractTenantDbFromLegacy(legacy, tenantId);
      if (
        hasBusinessData(slice) ||
        tenantOwnsLegacyDb(legacy, tenantId)
      ) {
        storage.write(orgKey, serializeDb(slice));
        return orgKey;
      }
    } catch {
      /* legacy parse hatası */
    }
  }

  return orgKey;
}

/** @deprecated bootstrapTenantWebStorage kullanın */
export function resolveTenantWebStorageKey(
  baseKey: string,
  organizationEmail: string,
  storage: TenantWebStorage
): string {
  return bootstrapTenantWebStorage(
    baseKey,
    organizationEmail,
    storage,
    (raw) => JSON.parse(raw) as LocalDb,
    (db) => JSON.stringify(db)
  );
}

export function entityBelongsToTenant(
  entity: ScopedEntity,
  tenantId: string,
  options?: { allowLegacyUnscoped?: boolean }
): boolean {
  const tenant = normalizeTenantId(tenantId);
  const oid = entity.organizationId?.trim().toLowerCase();
  if (!oid) return options?.allowLegacyUnscoped === true;
  return oid === tenant;
}
