import type {
  Product,
  Customer,
  CustomerTag,
  Coupon,
  Order,
  OrderItem,
  OrderPayment,
  ServiceType,
  ServicePrice,
  PaymentStatus,
  PaymentMethod,
  PaymentMode,
  OrderStatus,
  OrderPriority,
  ItemStatus,
  CouponType,
  TagColor,
  OrderWithMeta,
  OrderDashboardStats,
  CustomerListMeta,
  OrganizationSettings,
  CreditLedgerEntry,
  CreditReset,
  CreditLedgerType,
  WhatsappTemplate,
  AuditLogEntry,
} from "./schema";
import {
  SERVICE_PRICE_MODIFIERS,
  SERVICE_TYPES,
  DEFAULT_CUSTOMER_TAGS,
  derivePaymentStatus,
} from "./schema";
import { SEED_PRODUCTS } from "./seed";
import { toDateKey, addDaysToDate } from "@/lib/dates";
import { formatCustomerName } from "@/lib/utils";
import {
  resolveCustomerNameForOrder,
  summarizeOrderItemColors,
  cloneDefaultProductColorPalette,
  countItemReadiness,
  deriveOrderStatusFromItems,
  orderMatchesGlobalSearch,
  customerMatchesGlobalSearch,
  rankGlobalSearchHits,
  type GlobalSearchHit,
  type ProductColorPreset,
  computeCreateOrderFinancials,
} from "@cleanledger/shared";
import { AppError, ErrorCodes } from "@cleanledger/shared/errors";
import type { LocalDb, DatabaseSnapshot } from "@cleanledger/shared/schema/local-db";
import { LOCAL_DB_SCHEMA_VERSION } from "@cleanledger/shared/schema/local-db";
import {
  WEB_STORAGE_KEY_V2,
  WEB_STORAGE_KEY_V3,
  LEGACY_WEB_STORAGE_KEY,
  ORG_STORAGE_KEY,
  SHOP_PROFILE_STORAGE_KEY,
  SQLITE_V3_MIGRATIONS,
  SQLITE_V4_MIGRATIONS,
  emptyLocalDb,
  safeMigrateRecordToV4,
  mergeOrganizationProfile,
  createGlobalId,
} from "@cleanledger/shared/migrations";
import {
  withLogoHash,
  upsertSyncQueueEntry,
  getPendingSyncQueue,
  markSyncQueueSynced,
  applySyncChanges,
  customerSyncPayload,
  orderSyncPayload,
  organizationSyncPayload,
  productSyncPayload,
  couponSyncPayload,
  customerTagSyncPayload,
  servicePriceSyncPayload,
  whatsappTemplateSyncPayload,
  creditLedgerSyncPayload,
  auditLogSyncPayload,
} from "@cleanledger/shared/sync";
import type {
  SyncQueueEntry,
  SyncEntityType,
  SyncOperation,
} from "@cleanledger/shared/sync";
import {
  readLegacyOrgSettings,
  readLegacyShopProfile,
} from "@/lib/legacy-storage";
import {
  num,
  mapProduct,
  mapCustomer,
  mapCustomerTag,
  mapCoupon,
  mapServicePrice,
  mapOrder,
  mapOrderItem,
  mapOrderPayment,
  mapOrganizationSettings,
  mapSyncQueueRow,
  mapCreditLedger,
  mapCreditReset,
  mapAuditLog,
  mapWhatsappTemplate,
} from "@cleanledger/shared/schema/mappers";
import { computeLinePriceMetrics } from "@cleanledger/shared/reports";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@cleanledger/shared/templates";
import { formatItemNumber, formatOrderNumber } from "@cleanledger/shared/numbering";
import { normalizeOrganizationId } from "@cleanledger/shared/organization";
import {
  buildTenantSqlitePath,
  entityBelongsToTenant,
  extractTenantDbFromLegacy,
  hasBusinessData,
  isolateLocalDbForTenant,
  LEGACY_SHARED_SQLITE_PATH,
} from "@cleanledger/shared/tenant";
import { clearSyncUpdatedAt, setSyncMetaOrganization } from "@/lib/sync-meta";
import {
  ENTITY_SCOPE_DEFAULTS,
  BRANCH_SCOPE_DEFAULT,
} from "@cleanledger/shared/schema/entity-scope";

export type { LocalDb, DatabaseSnapshot };

const STORAGE_KEY = WEB_STORAGE_KEY_V3;

let organizationProfileCache: OrganizationSettings | null = null;

let activeSqliteOrgId: string | null = null;

export async function switchTenantContext(organizationEmail: string): Promise<void> {
  const tenantId = normalizeOrganizationId(organizationEmail);
  const previous = activeSqliteOrgId;
  setSyncMetaOrganization(tenantId);

  if (previous && previous !== tenantId) {
    await closeSqliteConnection();
  }

  activeSqliteOrgId = tenantId;
  await ensureTenantSqliteDatabase(tenantId);
}

/** Oturum kapanınca SQLite bağlantısı ve bellek önbelleği sıfırlanır. */
export async function purgeTenantSessionData(): Promise<void> {
  organizationProfileCache = null;
  activeSqliteOrgId = null;
  clearSyncUpdatedAt();
  await closeSqliteConnection();
}

async function ensureTenantSqliteDatabase(tenantId: string): Promise<void> {
  await getSqlDb();
  await runMigrations();
  const hasData = await tenantSqliteHasBusinessData();
  if (!hasData) {
    await migrateLegacySharedSqliteForTenant(tenantId);
  }
  await seedAll();
  await ensureWhatsappTemplatesSeeded();
}

async function tenantSqliteHasBusinessData(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const db = await getSqlDb();
    const rows = await db.select<{ count: number }>(
      "SELECT COUNT(*) as count FROM customers"
    );
    return (rows[0]?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

async function migrateLegacySharedSqliteForTenant(tenantId: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    let legacyDb;
    try {
      legacyDb = Database.get(LEGACY_SHARED_SQLITE_PATH);
      if (!legacyDb) {
        legacyDb = await Database.load(LEGACY_SHARED_SQLITE_PATH);
      }
      await legacyDb.select("SELECT 1");
    } catch {
      return;
    }

    const snapshot = await exportSqliteToLocalDb(legacyDb);
    const slice = extractTenantDbFromLegacy(snapshot, tenantId);
    if (!hasBusinessData(slice)) return;

    await applyLocalDbToTauri(slice);
  } catch (err) {
    console.warn("[CleanLedger] Legacy SQLite tenant migration skipped:", err);
  }
}

async function exportSqliteToLocalDb(db: {
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T[]>;
}): Promise<LocalDb> {
  const customers = (
    await db.select<Record<string, unknown>>("SELECT * FROM customers")
  ).map(mapCustomer);
  const orders = (
    await db.select<Record<string, unknown>>("SELECT * FROM orders")
  ).map(mapOrder);
  const orgRows = await db.select<Record<string, unknown>>(
    "SELECT * FROM organization_settings ORDER BY id DESC LIMIT 1"
  );
  const base = emptyLocalDb();
  base.customers = customers;
  base.orders = orders;
  base.organizationProfile = orgRows[0]
    ? mapOrganizationSettings(orgRows[0])
    : null;
  base.products = (
    await db.select<Record<string, unknown>>("SELECT * FROM products")
  ).map(mapProduct);
  base.orderItems = (
    await db.select<Record<string, unknown>>("SELECT * FROM order_items")
  ).map(mapOrderItem);
  return base;
}

function tenantGuard<T extends { organizationId?: string | null }>(
  entity: T | null | undefined
): T | null {
  if (!entity) return null;
  const orgId = getOrganizationId();
  if (!orgId) return null;
  if (!entityBelongsToTenant(entity, orgId)) return null;
  return entity;
}

function setOrganizationProfileCache(
  org: OrganizationSettings | null
): void {
  organizationProfileCache = org;
}

/** Tauri'de senkron okuma için bellek önbelleği; web'de localStorage snapshot. */
export function getOrganizationSettingsSync(): OrganizationSettings | null {
  if (isTauri()) return organizationProfileCache;
  return loadLocalDb().organizationProfile;
}

export async function hydrateOrganizationProfileCache(): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM organization_settings ORDER BY id DESC LIMIT 1"
    );
    setOrganizationProfileCache(
      rows[0] ? mapOrganizationSettings(rows[0]) : null
    );
    return;
  }
  setOrganizationProfileCache(loadLocalDb().organizationProfile);
}

function seedDefaultTags(startId = 1): CustomerTag[] {
  return DEFAULT_CUSTOMER_TAGS.map((t, i) => ({
    id: startId + i,
    globalId: null,
    organizationId: null,
    slug: t.slug,
    label: t.label,
    color: t.color,
  }));
}

function finalizeLocalDb(parsed: Record<string, unknown>): LocalDb {
  const { db: migrated, warnings } = safeMigrateRecordToV4(parsed);
  let db = migrated;
  if (warnings.length) {
    console.warn("[CleanLedger] Migration uyarıları:", warnings);
  }

  if (!db.organizationProfile) {
    db.organizationProfile = mergeOrganizationProfile(
      readLegacyOrgSettings(),
      readLegacyShopProfile()
    );
  }

  if (!Array.isArray(db.orderPayments)) db.orderPayments = [];
  if (!db.nextOrderPaymentId) db.nextOrderPaymentId = 1;
  backfillOrderPayments(db);

  if (Array.isArray(db.products)) {
    let productsChanged = false;
    db.products = db.products.map((product, index) => {
      if (product.sortOrder == null) {
        productsChanged = true;
        return { ...product, sortOrder: index };
      }
      return product;
    });
    if (productsChanged) saveLocalDb(db);
  }

  if (!Array.isArray(db.productColorPalette) || !db.productColorPalette.length) {
    db.productColorPalette = cloneDefaultProductColorPalette();
  }

  return db;
}

function loadLocalDb(): LocalDb {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const v2 = localStorage.getItem(WEB_STORAGE_KEY_V2);
      if (v2) {
        const migrated = finalizeLocalDb(JSON.parse(v2) as Record<string, unknown>);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(WEB_STORAGE_KEY_V2);
        localStorage.removeItem(ORG_STORAGE_KEY);
        localStorage.removeItem(SHOP_PROFILE_STORAGE_KEY);
        return migrated;
      }
      const legacy = localStorage.getItem(LEGACY_WEB_STORAGE_KEY);
      if (legacy) {
        const migrated = finalizeLocalDb(JSON.parse(legacy) as Record<string, unknown>);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_WEB_STORAGE_KEY);
        return migrated;
      }
      const db = emptyLocalDb();
      db.organizationProfile = mergeOrganizationProfile(
        readLegacyOrgSettings(),
        readLegacyShopProfile()
      );
      return db;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const schemaVersion = num(parsed.schemaVersion, 2);
    if (schemaVersion < LOCAL_DB_SCHEMA_VERSION) {
      const migrated = finalizeLocalDb(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(ORG_STORAGE_KEY);
      localStorage.removeItem(SHOP_PROFILE_STORAGE_KEY);
      return migrated;
    }
    return finalizeLocalDb(parsed);
  } catch {
    return emptyLocalDb();
  }
}

function saveLocalDb(db: LocalDb, options?: { silent?: boolean }): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  if (!options?.silent) triggerSyncPush();
}

function triggerSyncPush(immediate = false): void {
  void import("@/lib/sync-service").then((m) => {
    if (immediate) void m.runSyncPush(true);
    else m.scheduleSyncPush();
  });
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

type SqlDb = {
  execute: (
    query: string,
    bindValues?: unknown[]
  ) => Promise<{ lastInsertId: number; rowsAffected: number }>;
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T[]>;
};

let sqlDb: SqlDb | undefined;
let sqlDbPath: string | undefined;

export async function closeSqliteConnection(): Promise<void> {
  if (sqlDbPath) {
    try {
      const Database = (await import("@tauri-apps/plugin-sql")).default;
      const conn = Database.get(sqlDbPath);
      if (conn && typeof conn.close === "function") {
        await conn.close();
      }
    } catch {
      /* ignore */
    }
  }
  sqlDb = undefined;
  sqlDbPath = undefined;
}

function requireActiveSqliteOrgId(): string {
  const orgId = activeSqliteOrgId ?? getOrganizationId();
  if (!orgId?.trim()) {
    throw new AppError(ErrorCodes.DB_SESSION_REQUIRED);
  }
  return orgId.trim().toLowerCase();
}

async function getSqlDb(): Promise<SqlDb> {
  const orgId = requireActiveSqliteOrgId();
  const dbPath = buildTenantSqlitePath(orgId);
  if (sqlDb && sqlDbPath === dbPath) return sqlDb;

  await closeSqliteConnection();
  activeSqliteOrgId = orgId;

  const Database = (await import("@tauri-apps/plugin-sql")).default;
  let db = Database.get(dbPath);
  try {
    if (db) await db.select("SELECT 1");
  } catch {
    db = await Database.load(dbPath);
  }
  if (!db) {
    db = await Database.load(dbPath);
  }

  sqlDbPath = dbPath;
  sqlDb = {
    execute: async (query, bindValues) => {
      const result = await db.execute(query, bindValues);
      return {
        lastInsertId: result.lastInsertId ?? 0,
        rowsAffected: result.rowsAffected ?? 0,
      };
    },
    select: (query, bindValues) => db.select(query, bindValues),
  };
  return sqlDb;
}

export {
  mapProduct,
  mapCustomerTag,
  mapCoupon,
  mapCustomer,
  mapServicePrice,
  mapOrder,
  mapOrderItem,
  mapOrderPayment,
  mapOrganizationSettings,
} from "@cleanledger/shared/schema/mappers";

function backfillOrderPayments(db: LocalDb): void {
  for (const order of db.orders) {
    const active = db.orderPayments.filter(
      (p) => p.orderId === order.id && !p.refunded
    );
    const recorded = active.reduce((s, p) => s + p.amount, 0);
    if (order.amountPaid > recorded + 0.001) {
      db.orderPayments.push({
        ...ENTITY_SCOPE_DEFAULTS,
        id: db.nextOrderPaymentId++,
        orderId: order.id,
        amount: order.amountPaid - recorded,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        refunded: 0,
      });
    }
  }
}

async function writeCreditLedgerEntry(params: {
  customerId: number;
  orderId?: number | null;
  resetId?: number | null;
  entryType: CreditLedgerType;
  amount: number;
  balanceAfter: number;
  note?: string;
}): Promise<CreditLedgerEntry> {
  const organizationId = getOrganizationId() ?? "";
  const globalId = createGlobalId();
  const createdAt = new Date().toISOString();
  const note = params.note ?? "";

  let entry: CreditLedgerEntry;

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      `INSERT INTO credit_ledger (
         global_id, organization_id, customer_id, order_id, reset_id,
         entry_type, amount, balance_after, note, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        globalId,
        organizationId,
        params.customerId,
        params.orderId ?? null,
        params.resetId ?? null,
        params.entryType,
        params.amount,
        params.balanceAfter,
        note,
        createdAt,
      ]
    );
    entry = {
      id: result.lastInsertId,
      globalId,
      organizationId,
      customerId: params.customerId,
      orderId: params.orderId ?? null,
      resetId: params.resetId ?? null,
      entryType: params.entryType,
      amount: params.amount,
      balanceAfter: params.balanceAfter,
      note,
      createdAt,
    };
  } else {
    const local = loadLocalDb();
    entry = {
      id: local.nextCreditLedgerId++,
      globalId,
      organizationId,
      customerId: params.customerId,
      orderId: params.orderId ?? null,
      resetId: params.resetId ?? null,
      entryType: params.entryType,
      amount: params.amount,
      balanceAfter: params.balanceAfter,
      note,
      createdAt,
    };
    local.creditLedger.push(entry);
    saveLocalDb(local, { silent: true });
  }

  await enqueueSyncChange(
    "credit_ledger",
    globalId,
    "create",
    creditLedgerSyncPayload(entry),
    false
  );
  return entry;
}

async function appendAuditLogEntry(params: {
  entityType: string;
  entityGlobalId?: string | null;
  action: string;
  payload?: Record<string, unknown>;
  actorEmail?: string | null;
}): Promise<AuditLogEntry> {
  const organizationId = getOrganizationId() ?? "";
  const globalId = createGlobalId();
  const createdAt = new Date().toISOString();
  const payloadJson = JSON.stringify(params.payload ?? {});

  let entry: AuditLogEntry;

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      `INSERT INTO audit_log (
         global_id, organization_id, entity_type, entity_global_id,
         action, payload, actor_email, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        globalId,
        organizationId,
        params.entityType,
        params.entityGlobalId ?? null,
        params.action,
        payloadJson,
        params.actorEmail ?? null,
        createdAt,
      ]
    );
    entry = {
      id: result.lastInsertId,
      globalId,
      organizationId,
      entityType: params.entityType,
      entityGlobalId: params.entityGlobalId ?? null,
      action: params.action,
      payload: payloadJson,
      actorEmail: params.actorEmail ?? null,
      createdAt,
    };
  } else {
    const local = loadLocalDb();
    entry = {
      id: local.nextAuditLogId++,
      globalId,
      organizationId,
      entityType: params.entityType,
      entityGlobalId: params.entityGlobalId ?? null,
      action: params.action,
      payload: payloadJson,
      actorEmail: params.actorEmail ?? null,
      createdAt,
    };
    local.auditLog.push(entry);
    saveLocalDb(local, { silent: true });
  }

  await enqueueSyncChange(
    "audit_log",
    globalId,
    "create",
    auditLogSyncPayload(entry),
    false
  );
  return entry;
}

async function adjustCustomerCredit(
  customerId: number | null,
  customerPhone: string,
  delta: number,
  meta?: {
    orderId?: number | null;
    resetId?: number | null;
    entryType: CreditLedgerType;
    note?: string;
  }
): Promise<void> {
  if (Math.abs(delta) < 0.001) return;
  let cid = customerId;
  if (!cid) {
    const c = await getCustomerByPhone(customerPhone);
    cid = c?.id ?? null;
  }
  if (!cid) return;

  let next = 0;
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<{ credit_balance: number }>(
      "SELECT credit_balance FROM customers WHERE id = ?",
      [cid]
    );
    next = Math.max(0, (rows[0]?.credit_balance ?? 0) + delta);
    await db.execute("UPDATE customers SET credit_balance = ? WHERE id = ?", [
      next,
      cid,
    ]);
  } else {
    const local = loadLocalDb();
    const c = local.customers.find((x) => x.id === cid);
    if (!c) return;
    next = Math.max(0, c.creditBalance + delta);
    c.creditBalance = next;
    saveLocalDb(local);
  }

  if (meta) {
    await writeCreditLedgerEntry({
      customerId: cid,
      orderId: meta.orderId,
      resetId: meta.resetId,
      entryType: meta.entryType,
      amount: delta,
      balanceAfter: next,
      note: meta.note,
    });
  }
}

async function syncOrderPaymentTotals(
  orderId: number,
  orderPatch: {
    amountPaid: number;
    balanceDue: number;
    paymentStatus: PaymentStatus;
    paymentMethod?: PaymentMethod;
  }
): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    if (orderPatch.paymentMethod) {
      await db.execute(
        `UPDATE orders SET amount_paid = ?, balance_due = ?, payment_status = ?, payment_method = ? WHERE id = ?`,
        [
          orderPatch.amountPaid,
          orderPatch.balanceDue,
          orderPatch.paymentStatus,
          orderPatch.paymentMethod,
          orderId,
        ]
      );
    } else {
      await db.execute(
        `UPDATE orders SET amount_paid = ?, balance_due = ?, payment_status = ? WHERE id = ?`,
        [
          orderPatch.amountPaid,
          orderPatch.balanceDue,
          orderPatch.paymentStatus,
          orderId,
        ]
      );
    }
    return;
  }

  const local = loadLocalDb();
  const o = local.orders.find((x) => x.id === orderId);
  if (!o) return;
  o.amountPaid = orderPatch.amountPaid;
  o.balanceDue = orderPatch.balanceDue;
  o.paymentStatus = orderPatch.paymentStatus;
  if (orderPatch.paymentMethod) o.paymentMethod = orderPatch.paymentMethod;
  saveLocalDb(local);
}

async function insertOrderPaymentRecord(
  orderId: number,
  amount: number,
  paymentMethod: PaymentMethod,
  createdAt: string
): Promise<OrderPayment> {
  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      `INSERT INTO order_payments (order_id, amount, payment_method, created_at, refunded)
       VALUES (?, ?, ?, ?, 0)`,
      [orderId, amount, paymentMethod, createdAt]
    );
    return {
      ...ENTITY_SCOPE_DEFAULTS,
      id: result.lastInsertId,
      orderId,
      amount,
      paymentMethod,
      createdAt,
      refunded: 0,
    };
  }

  const local = loadLocalDb();
  const payment: OrderPayment = {
    ...ENTITY_SCOPE_DEFAULTS,
    id: local.nextOrderPaymentId++,
    orderId,
    amount,
    paymentMethod,
    createdAt,
    refunded: 0,
  };
  local.orderPayments.push(payment);
  saveLocalDb(local);
  return payment;
}

async function getOrderById(orderId: number): Promise<Order | null> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );
    return rows[0] ? mapOrder(rows[0]) : null;
  }
  const local = loadLocalDb();
  const o = local.orders.find((x) => x.id === orderId);
  return o ? mapOrder(o as unknown as Record<string, unknown>) : null;
}

export function defaultPriceForService(
  basePrice: number,
  serviceType: ServiceType
): number {
  const mod = SERVICE_PRICE_MODIFIERS[serviceType];
  if (mod.type === "fixed") return mod.value;
  return Math.round(basePrice * (mod.value / 100));
}

async function runMigrations(): Promise<void> {
  const db = await getSqlDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      base_price REAL NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  try {
    await db.execute(
      `ALTER TABLE products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
    );
  } catch {
    /* exists */
  }
  try {
    const legacy = await db.select<{ id: number; sort_order: number }>(
      "SELECT id, sort_order FROM products ORDER BY id",
    );
    if (
      legacy.length > 0 &&
      legacy.every((row) => num(row.sort_order) === 0)
    ) {
      for (let i = 0; i < legacy.length; i++) {
        await db.execute("UPDATE products SET sort_order = ? WHERE id = ?", [
          i,
          legacy[i].id,
        ]);
      }
    }
  } catch {
    /* migration best-effort */
  }
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      notes TEXT DEFAULT '',
      address TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS service_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, service_type)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER,
      customer_phone TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'received',
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  try {
    await db.execute(`ALTER TABLE orders ADD COLUMN customer_id INTEGER`);
  } catch {
    /* exists */
  }
  try {
    await db.execute(
      `ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'`
    );
  } catch {
    /* exists */
  }
  try {
    await db.execute(
      `ALTER TABLE orders ADD COLUMN order_status TEXT NOT NULL DEFAULT 'preparing'`
    );
  } catch {
    /* exists */
  }
  try {
    await db.execute(`ALTER TABLE orders ADD COLUMN delivery_date TEXT`);
  } catch {
    /* exists */
  }
  try {
    await db.execute(
      `ALTER TABLE orders ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'`
    );
  } catch {
    /* exists */
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS organization_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL DEFAULT '',
      admin_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      auth_token TEXT NOT NULL DEFAULT '',
      trial_ends_at TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS customer_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'slate'
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  const tagCols = [
    `ALTER TABLE customers ADD COLUMN tag_id INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE customers ADD COLUMN credit_balance REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN last_name TEXT DEFAULT ''`,
    `ALTER TABLE orders ADD COLUMN subtotal_amount REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN amount_paid REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN balance_due REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'`,
    `ALTER TABLE orders ADD COLUMN coupon_code TEXT`,
  ];
  for (const sql of tagCols) {
    try {
      await db.execute(sql);
    } catch {
      /* exists */
    }
  }

  const existingTags = await db.select<{ count: number }>(
    "SELECT COUNT(*) as count FROM customer_tags"
  );
  if ((existingTags[0]?.count ?? 0) === 0) {
    for (const t of DEFAULT_CUSTOMER_TAGS) {
      await db.execute(
        "INSERT INTO customer_tags (slug, label, color) VALUES (?, ?, ?)",
        [t.slug, t.label, t.color]
      );
    }
  }

  await db.execute(
    `UPDATE orders SET subtotal_amount = total_amount WHERE subtotal_amount IS NULL OR subtotal_amount = 0`
  );
  await db.execute(
    `UPDATE orders SET amount_paid = total_amount WHERE payment_status = 'paid' AND (amount_paid IS NULL OR amount_paid = 0)`
  );
  await db.execute(
    `UPDATE orders SET balance_due = total_amount - amount_paid WHERE balance_due IS NULL`
  );

  const defaultDelivery = toDateKey(addDaysToDate(new Date(), 3));
  await db.execute(
    `UPDATE orders SET delivery_date = ? WHERE delivery_date IS NULL OR delivery_date = ''`,
    [defaultDelivery]
  );
  await db.execute(
    `UPDATE orders SET order_status = 'preparing' WHERE order_status IS NULL OR order_status = '' OR order_status = 'received'`
  );
  await db.execute(
    `UPDATE orders SET payment_status = 'unpaid' WHERE payment_status IS NULL OR payment_status = ''`
  );
  await db.execute(
    `UPDATE orders SET priority = 'normal' WHERE priority IS NULL OR priority = ''`
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS order_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      created_at TEXT NOT NULL,
      refunded INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  const ordersNeedingPayments = await db.select<{
    id: number;
    amount_paid: number;
    payment_method: string;
    created_at: string;
  }>(
    `SELECT o.id, o.amount_paid, o.payment_method, o.created_at
     FROM orders o
     WHERE o.amount_paid > 0
       AND NOT EXISTS (
         SELECT 1 FROM order_payments p
         WHERE p.order_id = o.id AND p.refunded = 0
       )`
  );
  for (const row of ordersNeedingPayments) {
    await db.execute(
      `INSERT INTO order_payments (order_id, amount, payment_method, created_at, refunded)
       VALUES (?, ?, ?, ?, 0)`,
      [
        row.id,
        row.amount_paid,
        row.payment_method ?? "cash",
        row.created_at,
      ]
    );
  }

  for (const sql of SQLITE_V3_MIGRATIONS) {
    try {
      await db.execute(sql);
    } catch {
      /* kolon/tablo zaten var */
    }
  }
  for (const sql of SQLITE_V4_MIGRATIONS) {
    try {
      await db.execute(sql);
    } catch {
      /* kolon/tablo zaten var */
    }
  }
}

async function seedServicePricesForProduct(
  productId: number,
  basePrice: number
): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    for (const st of SERVICE_TYPES) {
      const price = defaultPriceForService(basePrice, st);
      await db.execute(
        `INSERT OR IGNORE INTO service_prices (product_id, service_type, price) VALUES (?, ?, ?)`,
        [productId, st, price]
      );
    }
    return;
  }

  const local = loadLocalDb();
  for (const st of SERVICE_TYPES) {
    const exists = local.servicePrices.some(
      (sp) => sp.productId === productId && sp.serviceType === st
    );
    if (exists) continue;
    local.servicePrices.push({
      ...ENTITY_SCOPE_DEFAULTS,
      id: local.nextServicePriceId++,
      productId,
      serviceType: st,
      price: defaultPriceForService(basePrice, st),
    });
  }
  saveLocalDb(local);
}

async function seedAll(): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    const existing = await db.select<{ count: number }>(
      "SELECT COUNT(*) as count FROM products"
    );
    const productCount = existing[0]?.count ?? 0;

    if (productCount > 0) {
      const bad = await db.select<Record<string, unknown>>(
        "SELECT id, base_price FROM products WHERE base_price IS NULL OR base_price <= 0"
      );
      for (const row of bad) {
        const seed = SEED_PRODUCTS[num(row.id) - 1];
        if (seed) {
          await db.execute("UPDATE products SET base_price = ? WHERE id = ?", [
            seed.basePrice,
            row.id,
          ]);
        }
      }
      const products = await db.select<Record<string, unknown>>(
        "SELECT * FROM products"
      );
      for (const row of products) {
        const p = mapProduct(row);
        await seedServicePricesForProduct(p.id, p.basePrice);
      }
      return;
    }

    for (const p of SEED_PRODUCTS) {
      const result = await db.execute(
        "INSERT INTO products (name, icon_name, base_price, sort_order) VALUES (?, ?, ?, ?)",
        [p.name, p.iconName, p.basePrice, SEED_PRODUCTS.indexOf(p)],
      );
      await seedServicePricesForProduct(result.lastInsertId, p.basePrice);
    }
    return;
  }

  const local = loadLocalDb();
  if (local.products.length === 0) {
    SEED_PRODUCTS.forEach((p, index) => {
      const id = local.nextProductId++;
      local.products.push({ ...ENTITY_SCOPE_DEFAULTS, id, ...p, sortOrder: index });
      for (const st of SERVICE_TYPES) {
        local.servicePrices.push({
          ...ENTITY_SCOPE_DEFAULTS,
          id: local.nextServicePriceId++,
          productId: id,
          serviceType: st,
          price: defaultPriceForService(p.basePrice, st),
        });
      }
    });
    saveLocalDb(local);
  }
}

export async function initDatabase(): Promise<void> {
  if (!isTauri()) {
    await seedAll();
    await ensureWhatsappTemplatesSeeded();
    return;
  }
  const orgId = getOrganizationId();
  if (orgId) {
    await ensureTenantSqliteDatabase(orgId);
    return;
  }
}

export async function getProducts(): Promise<Product[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM products ORDER BY sort_order ASC, id ASC"
    );
    return rows.map(mapProduct);
  }
  return [...loadLocalDb().products].sort(
    (a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id),
  );
}

export async function getServicePrices(): Promise<ServicePrice[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM service_prices ORDER BY product_id, service_type"
    );
    return rows.map(mapServicePrice);
  }
  return loadLocalDb().servicePrices;
}

export async function getServicePrice(
  productId: number,
  serviceType: ServiceType
): Promise<number> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT price FROM service_prices WHERE product_id = ? AND service_type = ?",
      [productId, serviceType]
    );
    if (rows[0]) return num(rows[0].price);
    const product = (await getProducts()).find((p) => p.id === productId);
    return product
      ? defaultPriceForService(product.basePrice, serviceType)
      : 0;
  }
  const local = loadLocalDb();
  const sp = local.servicePrices.find(
    (s) => s.productId === productId && s.serviceType === serviceType
  );
  if (sp) return sp.price;
  const product = local.products.find((p) => p.id === productId);
  return product ? defaultPriceForService(product.basePrice, serviceType) : 0;
}

export async function updateServicePrice(
  productId: number,
  serviceType: ServiceType,
  price: number
): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      `INSERT INTO service_prices (product_id, service_type, price) VALUES (?, ?, ?)
       ON CONFLICT(product_id, service_type) DO UPDATE SET price = excluded.price`,
      [productId, serviceType, price]
    );
    await enqueueServicePriceSync(productId, serviceType);
    return;
  }
  const local = loadLocalDb();
  const idx = local.servicePrices.findIndex(
    (s) => s.productId === productId && s.serviceType === serviceType
  );
  if (idx >= 0) local.servicePrices[idx].price = price;
  else
    local.servicePrices.push({
      ...ENTITY_SCOPE_DEFAULTS,
      id: local.nextServicePriceId++,
      productId,
      serviceType,
      price,
    });
  saveLocalDb(local, { silent: true });
  await enqueueServicePriceSync(productId, serviceType);
}

export async function updateProductBasePrice(
  productId: number,
  basePrice: number
): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("UPDATE products SET base_price = ? WHERE id = ?", [
      basePrice,
      productId,
    ]);
    await enqueueProductSyncById(productId);
    return;
  }
  const local = loadLocalDb();
  const p = local.products.find((x) => x.id === productId);
  if (p) p.basePrice = basePrice;
  saveLocalDb(local, { silent: true });
  await enqueueProductSyncById(productId);
}

export function calculateServicePrice(
  basePrice: number,
  serviceType: ServiceType
): number {
  return defaultPriceForService(basePrice, serviceType);
}

// ─── Customers ───────────────────────────────────────────────────────────────

export interface CustomerInput {
  name: string;
  lastName?: string;
  phone: string;
  notes?: string;
  address?: string;
  tagId?: number;
}

export async function getCustomers(): Promise<Customer[]> {
  if (isTauri()) {
    const orgId = requireActiveSqliteOrgId();
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM customers WHERE organization_id = ? ORDER BY name",
      [orgId]
    );
    return rows.map(mapCustomer).filter((c) => entityBelongsToTenant(c, orgId));
  }
  return loadLocalDb().customers;
}

export async function getCustomerByPhone(
  phone: string
): Promise<Customer | null> {
  const normalized = phone.trim();
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM customers WHERE phone = ?",
      [normalized]
    );
    return tenantGuard(rows[0] ? mapCustomer(rows[0]) : null);
  }
  return tenantGuard(
    loadLocalDb().customers.find((c) => c.phone === normalized) ?? null
  );
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    );
    return tenantGuard(rows[0] ? mapCustomer(rows[0]) : null);
  }
  return loadLocalDb().customers.find((c) => c.id === id) ?? null;
}

export async function getCustomerCreditLedger(
  customerId: number
): Promise<CreditLedgerEntry[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM credit_ledger WHERE customer_id = ? ORDER BY created_at DESC, id DESC",
      [customerId]
    );
    return rows.map(mapCreditLedger);
  }
  return loadLocalDb()
    .creditLedger.filter((e) => e.customerId === customerId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        b.id - a.id
    );
}

export async function getLastActiveCreditReset(
  customerId: number
): Promise<CreditReset | null> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      `SELECT * FROM credit_resets
       WHERE customer_id = ? AND undone_at IS NULL
       ORDER BY reset_at DESC, id DESC LIMIT 1`,
      [customerId]
    );
    return rows[0] ? mapCreditReset(rows[0]) : null;
  }
  const resets = loadLocalDb()
    .creditResets.filter((r) => r.customerId === customerId && !r.undoneAt)
    .sort(
      (a, b) =>
        new Date(b.resetAt).getTime() - new Date(a.resetAt).getTime() ||
        b.id - a.id
    );
  return resets[0] ?? null;
}

export async function resetCustomerCredit(
  customerId: number,
  options: { note?: string; actorEmail?: string | null } = {}
): Promise<CreditReset> {
  const customer = await getCustomerById(customerId);
  if (!customer) throw new AppError(ErrorCodes.CUSTOMER_NOT_FOUND);
  if (customer.creditBalance <= 0.001) {
    throw new AppError(ErrorCodes.NO_CREDIT_BALANCE);
  }

  const amountReset = customer.creditBalance;
  const organizationId =
    getOrganizationId() ?? customer.organizationId ?? "";
  const globalId = createGlobalId();
  const resetAt = new Date().toISOString();
  const note = options.note?.trim() ?? "";

  let reset: CreditReset;

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      `INSERT INTO credit_resets (
         global_id, organization_id, customer_id, amount_reset, reset_at, note
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [globalId, organizationId, customerId, amountReset, resetAt, note]
    );
    reset = {
      id: result.lastInsertId,
      globalId,
      organizationId,
      customerId,
      amountReset,
      resetAt,
      undoneAt: null,
      note,
    };
  } else {
    const local = loadLocalDb();
    reset = {
      id: local.nextCreditResetId++,
      globalId,
      organizationId,
      customerId,
      amountReset,
      resetAt,
      undoneAt: null,
      note,
    };
    local.creditResets.push(reset);
    saveLocalDb(local, { silent: true });
  }

  await adjustCustomerCredit(customerId, customer.phone, -amountReset, {
    resetId: reset.id,
    entryType: "reset",
    note: note || "Cari sıfırlama",
  });

  await appendAuditLogEntry({
    entityType: "credit_reset",
    entityGlobalId: reset.globalId,
    action: "reset",
    payload: { customerId, amountReset, previousBalance: amountReset },
    actorEmail: options.actorEmail,
  });

  return reset;
}

export async function undoLastCreditReset(
  customerId: number,
  actorEmail?: string | null
): Promise<void> {
  const reset = await getLastActiveCreditReset(customerId);
  if (!reset) throw new AppError(ErrorCodes.NO_CREDIT_RESET);

  const customer = await getCustomerById(customerId);
  if (!customer) throw new AppError(ErrorCodes.CUSTOMER_NOT_FOUND);

  const undoneAt = new Date().toISOString();

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("UPDATE credit_resets SET undone_at = ? WHERE id = ?", [
      undoneAt,
      reset.id,
    ]);
  } else {
    const local = loadLocalDb();
    const row = local.creditResets.find((r) => r.id === reset.id);
    if (row) row.undoneAt = undoneAt;
    saveLocalDb(local, { silent: true });
  }

  await adjustCustomerCredit(customerId, customer.phone, reset.amountReset, {
    resetId: reset.id,
    entryType: "reset_undo",
    note: "Sıfırlama geri alındı",
  });

  await appendAuditLogEntry({
    entityType: "credit_reset",
    entityGlobalId: reset.globalId,
    action: "undo",
    payload: {
      customerId,
      amountReset: reset.amountReset,
      resetAt: reset.resetAt,
    },
    actorEmail,
  });
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const now = new Date().toISOString();
  const tagId = input.tagId ?? 1;
  const globalId = createGlobalId();
  const orgId = isTauri()
    ? (await getOrganizationSettings())?.organizationId ?? null
    : loadLocalDb().organizationProfile?.organizationId ?? null;
  const data = {
    name: input.name.trim(),
    lastName: input.lastName?.trim() ?? "",
    phone: input.phone.trim(),
    notes: input.notes?.trim() ?? "",
    address: input.address?.trim() ?? "",
    tagId,
    creditBalance: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      `INSERT INTO customers (global_id, organization_id, name, last_name, phone, notes, address, tag_id, credit_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        globalId,
        orgId,
        data.name,
        data.lastName,
        data.phone,
        data.notes,
        data.address,
        data.tagId,
        data.creditBalance,
        data.createdAt,
        data.updatedAt,
      ]
    );
    const customer: Customer = {
      ...ENTITY_SCOPE_DEFAULTS,
      ...BRANCH_SCOPE_DEFAULT,
      id: result.lastInsertId,
      globalId,
      organizationId: orgId,
      ...data,
    };
    await enqueueSyncChange(
      "customer",
      globalId,
      "create",
      customerSyncPayload(customer)
    );
    return customer;
  }

  const local = loadLocalDb();
  const customer: Customer = {
    ...ENTITY_SCOPE_DEFAULTS,
    ...BRANCH_SCOPE_DEFAULT,
    id: local.nextCustomerId++,
    globalId,
    organizationId: orgId,
    ...data,
  };
  local.customers.push(customer);
  saveLocalDb(local, { silent: true });
  await enqueueSyncChange(
    "customer",
    globalId,
    "create",
    customerSyncPayload(customer)
  );
  return customer;
}

export async function updateCustomer(
  id: number,
  input: CustomerInput
): Promise<Customer> {
  const now = new Date().toISOString();
  const tagId = input.tagId ?? 1;
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      `UPDATE customers SET name = ?, last_name = ?, phone = ?, notes = ?, address = ?, tag_id = ?, updated_at = ? WHERE id = ?`,
      [
        input.name.trim(),
        input.lastName?.trim() ?? "",
        input.phone.trim(),
        input.notes?.trim() ?? "",
        input.address?.trim() ?? "",
        tagId,
        now,
        id,
      ]
    );
    const updated = (await getCustomerById(id))!;
    if (updated.globalId) {
      await enqueueSyncChange(
        "customer",
        updated.globalId,
        "update",
        customerSyncPayload(updated)
      );
    } else {
      triggerSyncPush();
    }
    return updated;
  }

  const local = loadLocalDb();
  const c = local.customers.find((x) => x.id === id)!;
  c.name = input.name.trim();
  c.lastName = input.lastName?.trim() ?? "";
  c.phone = input.phone.trim();
  c.notes = input.notes?.trim() ?? "";
  c.address = input.address?.trim() ?? "";
  c.tagId = tagId;
  c.updatedAt = now;
  saveLocalDb(local, { silent: true });
  if (c.globalId) {
    await enqueueSyncChange(
      "customer",
      c.globalId,
      "update",
      customerSyncPayload(c)
    );
  } else {
    triggerSyncPush();
  }
  return c;
}

export async function deleteCustomer(id: number): Promise<void> {
  const { orders } = await getCustomerOrders(id);
  if (orders.length > 0) {
    throw new AppError(ErrorCodes.CUSTOMER_HAS_ORDERS);
  }

  const customer = await getCustomerById(id);
  const globalId = customer?.globalId;

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM customers WHERE id = ?", [id]);
    if (globalId) {
      await enqueueSyncChange("customer", globalId, "delete", {});
    }
    return;
  }
  const local = loadLocalDb();
  local.customers = local.customers.filter((c) => c.id !== id);
  saveLocalDb(local, { silent: true });
  if (globalId) {
    await enqueueSyncChange("customer", globalId, "delete", {});
  }
}

export interface CustomerOrderSummary {
  orders: Order[];
  totalSpent: number;
}

export interface CustomerHistoryEntry {
  order: Order;
  items: OrderItemDetail[];
  payments: OrderPayment[];
}

export async function getCustomerOrders(
  customerId: number
): Promise<CustomerOrderSummary> {
  const customer = await getCustomerById(customerId);
  if (!customer) return { orders: [], totalSpent: 0 };

  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      `SELECT * FROM orders WHERE customer_id = ? OR customer_phone = ? ORDER BY created_at DESC`,
      [customerId, customer.phone]
    );
    const orders = rows.map(mapOrder);
    return {
      orders,
      totalSpent: orders.reduce((s, o) => s + o.totalAmount, 0),
    };
  }

  const local = loadLocalDb();
  const orders = local.orders.filter(
    (o) => o.customerId === customerId || o.customerPhone === customer.phone
  );
  return {
    orders,
    totalSpent: orders.reduce((s, o) => s + o.totalAmount, 0),
  };
}

export async function getCustomerOrdersByPhone(
  phone: string
): Promise<CustomerOrderSummary> {
  const trimmed = phone.trim();
  if (!trimmed) return { orders: [], totalSpent: 0 };

  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      `SELECT * FROM orders WHERE customer_phone = ? ORDER BY created_at DESC`,
      [trimmed]
    );
    const orders = rows.map(mapOrder);
    return {
      orders,
      totalSpent: orders.reduce((s, o) => s + o.totalAmount, 0),
    };
  }

  const local = loadLocalDb();
  const orders = local.orders
    .filter((o) => o.customerPhone === trimmed)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    orders,
    totalSpent: orders.reduce((s, o) => s + o.totalAmount, 0),
  };
}

export async function getCustomerHistoryDetails(
  customerId: number
): Promise<CustomerHistoryEntry[]> {
  const { orders } = await getCustomerOrders(customerId);
  const entries = await Promise.all(
    orders.map(async (order) => ({
      order,
      items: await getOrderItemsForOrder(order.id),
      payments: await getOrderPayments(order.id),
    }))
  );
  return entries.sort(
    (a, b) =>
      new Date(b.order.createdAt).getTime() -
      new Date(a.order.createdAt).getTime()
  );
}

// ─── Product color palette ───────────────────────────────────────────────────

export async function getProductColorPalette(): Promise<ProductColorPreset[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<{ label: string; hex: string }>(
      "SELECT label, hex FROM product_color_palette ORDER BY sort_order ASC, id ASC"
    );
    if (!rows.length) {
      const defaults = cloneDefaultProductColorPalette();
      await saveProductColorPalette(defaults);
      return defaults;
    }
    return rows.map((r) => ({ label: r.label, hex: r.hex }));
  }
  const local = loadLocalDb();
  if (local.productColorPalette?.length) {
    return local.productColorPalette;
  }
  return cloneDefaultProductColorPalette();
}

export async function saveProductColorPalette(
  palette: ProductColorPreset[]
): Promise<void> {
  const cleaned = palette
    .map((p) => ({ label: p.label.trim(), hex: p.hex.trim() }))
    .filter((p) => p.label && p.hex);
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM product_color_palette");
    for (let i = 0; i < cleaned.length; i++) {
      await db.execute(
        "INSERT INTO product_color_palette (label, hex, sort_order) VALUES (?, ?, ?)",
        [cleaned[i].label, cleaned[i].hex, i]
      );
    }
    triggerSyncPush();
    return;
  }
  const local = loadLocalDb();
  local.productColorPalette = cleaned;
  saveLocalDb(local);
}

// ─── Orders ──────────────────────────────────────────────────────────────────

function generateOrderNumber(seq: number): string {
  return formatOrderNumber(new Date().getFullYear(), seq);
}

export interface CreateOrderInput {
  customerPhone: string;
  customerId?: number | null;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  couponCode?: string | null;
  discountAmount?: number;
  orderStatus?: OrderStatus;
  deliveryDate: string;
  priority?: OrderPriority;
  items: Array<{
    productId: number;
    serviceType: ServiceType;
    subtotal: number;
    originalPrice?: number;
    salePrice?: number;
    quantity?: number;
    color?: string | null;
  }>;
  paymentMode?: import("./schema").PaymentMode;
}

export async function createOrder(
  input: CreateOrderInput
): Promise<{ order: Order; items: OrderItem[] }> {
  const financials = computeCreateOrderFinancials({
    items: input.items,
    amountPaid: input.amountPaid,
    paymentMethod: input.paymentMethod,
    paymentMode: input.paymentMode,
    discountAmount: input.discountAmount,
    orderStatus: input.orderStatus,
    priority: input.priority,
    couponCode: input.couponCode,
  });
  const {
    subtotalAmount,
    discountAmount,
    totalAmount,
    paymentMode,
    amountPaid,
    balanceDue,
    paymentStatus,
    orderStatus,
    priority,
    paymentMethod,
    couponCode,
  } = financials;
  const createdAt = new Date().toISOString();
  let customerId = input.customerId ?? null;
  const orgProfile = isTauri()
    ? await getOrganizationSettings()
    : loadLocalDb().organizationProfile;
  const organizationId = orgProfile?.organizationId ?? null;
  const orderGlobalId = createGlobalId();

  if (!customerId) {
    const existing = await getCustomerByPhone(input.customerPhone);
    if (existing) customerId = existing.id;
  }

  if (isTauri()) {
    const db = await getSqlDb();
    const countRow = await db.select<{ count: number }>(
      "SELECT COUNT(*) as count FROM orders"
    );
    const orderNumber = generateOrderNumber((countRow[0]?.count ?? 0) + 1);

    const result = await db.execute(
      `INSERT INTO orders (
         global_id, organization_id, order_number, customer_id, customer_phone,
         subtotal_amount, discount_amount, total_amount, amount_paid, balance_due,
         payment_method, payment_mode, coupon_code, payment_status, order_status,
         delivery_date, priority, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderGlobalId,
        organizationId,
        orderNumber,
        customerId,
        input.customerPhone,
        subtotalAmount,
        discountAmount,
        totalAmount,
        amountPaid,
        balanceDue,
        paymentMethod,
        paymentMode,
        couponCode,
        paymentStatus,
        orderStatus,
        input.deliveryDate,
        priority,
        createdAt,
      ]
    );
    const orderId = result.lastInsertId;

    const items: OrderItem[] = [];
    for (let index = 0; index < input.items.length; index++) {
      const item = input.items[index];
      const salePrice = item.salePrice ?? item.subtotal;
      const originalPrice = item.originalPrice ?? salePrice;
      const itemNumber = formatItemNumber(orderNumber, index + 1);
      const itemGlobalId = createGlobalId();
      const itemResult = await db.execute(
        `INSERT INTO order_items (
           global_id, organization_id, order_id, product_id, item_number,
           service_type, quantity, original_price, sale_price, subtotal, item_status, color
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemGlobalId,
          organizationId,
          orderId,
          item.productId,
          itemNumber,
          item.serviceType,
          item.quantity ?? 1,
          originalPrice,
          salePrice,
          item.subtotal,
          "received",
          item.color ?? null,
        ]
      );
      items.push({
        id: itemResult.lastInsertId,
        globalId: itemGlobalId,
        organizationId,
        orderId,
        productId: item.productId,
        itemNumber,
        serviceType: item.serviceType,
        quantity: item.quantity ?? 1,
        originalPrice,
        salePrice,
        subtotal: item.subtotal,
        itemStatus: "received",
        color: item.color ?? null,
      });
    }

    if (customerId && balanceDue > 0) {
      await adjustCustomerCredit(customerId, input.customerPhone, balanceDue, {
        orderId,
        entryType: "order_debit",
        note: `Sipariş ${orderNumber}`,
      });
    }

    if (amountPaid > 0) {
      await insertOrderPaymentRecord(
        orderId,
        amountPaid,
        paymentMethod,
        createdAt
      );
    }

    const orderRow: Order = {
      id: orderId,
      globalId: orderGlobalId,
      organizationId,
      branchId: null,
      orderNumber,
      customerId,
      customerPhone: input.customerPhone,
      subtotalAmount,
      discountAmount,
      totalAmount,
      amountPaid,
      balanceDue,
      paymentMethod,
      paymentMode,
      couponCode,
      paymentStatus,
      orderStatus,
      deliveryDate: input.deliveryDate,
      priority,
      createdAt,
    };
    const orderPayments = amountPaid > 0
      ? await (async () => {
          const rows = await (await getSqlDb()).select<Record<string, unknown>>(
            "SELECT * FROM order_payments WHERE order_id = ?",
            [orderId]
          );
          return rows.map(mapOrderPayment);
        })()
      : [];
    await enqueueSyncChange(
      "order",
      orderGlobalId,
      "create",
      orderSyncPayload(orderRow, items, orderPayments),
      true
    );
    return { order: orderRow, items };
  }

  const local = loadLocalDb();
  const orderNumber = generateOrderNumber(local.nextOrderNumber++);
  const orderId = local.nextOrderId++;

  const order: Order = {
    id: orderId,
    globalId: orderGlobalId,
    organizationId,
    branchId: null,
    orderNumber,
    customerId,
    customerPhone: input.customerPhone,
    subtotalAmount,
    discountAmount,
    totalAmount,
    amountPaid,
    balanceDue,
    paymentMethod,
    paymentMode,
    couponCode,
    paymentStatus,
    orderStatus,
    deliveryDate: input.deliveryDate,
    priority,
    createdAt,
  };
  local.orders.push(order);

  const items: OrderItem[] = input.items.map((item, index) => {
    const salePrice = item.salePrice ?? item.subtotal;
    const originalPrice = item.originalPrice ?? salePrice;
    const row: OrderItem = {
      id: local.nextOrderItemId++,
      globalId: createGlobalId(),
      organizationId,
      orderId,
      productId: item.productId,
      itemNumber: formatItemNumber(orderNumber, index + 1),
      serviceType: item.serviceType,
      quantity: item.quantity ?? 1,
      originalPrice,
      salePrice,
      subtotal: item.subtotal,
      itemStatus: "received",
      color: item.color ?? null,
    };
    local.orderItems.push(row);
    return row;
  });

  if (customerId && balanceDue > 0) {
    await adjustCustomerCredit(customerId, input.customerPhone, balanceDue, {
      orderId,
      entryType: "order_debit",
      note: `Sipariş ${orderNumber}`,
    });
  }

  if (amountPaid > 0) {
    local.orderPayments.push({
      ...ENTITY_SCOPE_DEFAULTS,
      id: local.nextOrderPaymentId++,
      orderId,
      amount: amountPaid,
      paymentMethod,
      createdAt,
      refunded: 0,
    });
  }

  saveLocalDb(local, { silent: true });
  const payments = local.orderPayments.filter((p) => p.orderId === orderId);
  await enqueueSyncChange(
    "order",
    orderGlobalId,
    "create",
    orderSyncPayload(order, items, payments),
    true
  );
  return { order, items };
}

export async function upsertCustomerByPhone(
  phone: string,
  name?: string,
  lastName?: string
): Promise<Customer | null> {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const existing = await getCustomerByPhone(trimmed);
  if (existing) {
    if (name?.trim() || lastName?.trim()) {
      return updateCustomer(existing.id, {
        name: name?.trim() || existing.name,
        lastName: lastName?.trim() ?? existing.lastName ?? "",
        phone: trimmed,
        notes: existing.notes ?? "",
        address: existing.address ?? "",
        tagId: existing.tagId,
      });
    }
    return existing;
  }
  if (name?.trim()) {
    return createCustomer({
      name: name.trim(),
      lastName: lastName?.trim(),
      phone: trimmed,
    });
  }
  return null;
}

// ─── Order tracking & stats ───────────────────────────────────────────────────

async function enrichOrders(orders: Order[]): Promise<OrderWithMeta[]> {
  const customers = await getCustomers();
  const palette = await getProductColorPalette();
  const nameFor = (o: Order) =>
    resolveCustomerNameForOrder(o, customers);

  if (isTauri()) {
    const db = await getSqlDb();
    return Promise.all(
      orders.map(async (o) => {
        const itemRows = await db.select<{
          color: string | null;
          item_number: string;
          item_status: string;
        }>(
          "SELECT color, item_number, item_status FROM order_items WHERE order_id = ?",
          [o.id]
        );
        const readiness = countItemReadiness(
          itemRows.map((r) => ({ itemStatus: r.item_status as ItemStatus }))
        );
        const countRow = await db.select<{ count: number }>(
          "SELECT COUNT(*) as count FROM order_items WHERE order_id = ?",
          [o.id]
        );
        return {
          ...o,
          itemCount: countRow[0]?.count ?? 0,
          customerName: nameFor(o),
          itemColors: summarizeOrderItemColors(
            itemRows.map((r) => r.color),
            palette
          ),
          itemNumbers: itemRows
            .map((r) => r.item_number)
            .filter((n) => n && n.trim()),
          itemReadyCount: readiness.ready,
          itemActiveCount: readiness.total,
        };
      })
    );
  }

  const local = loadLocalDb();
  return orders.map((o) => {
    const items = local.orderItems.filter((i) => i.orderId === o.id);
    const readiness = countItemReadiness(
      items.map((i) => ({ itemStatus: i.itemStatus as ItemStatus }))
    );
    return {
      ...o,
      itemCount: items.length,
      customerName: nameFor(o),
      itemColors: summarizeOrderItemColors(
        items.map((i) => i.color),
        palette
      ),
      itemNumbers: items
        .map((i) => i.itemNumber)
        .filter((n) => n && n.trim()),
      itemReadyCount: readiness.ready,
      itemActiveCount: readiness.total,
    };
  });
}

export async function getActiveOrders(): Promise<OrderWithMeta[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      `SELECT * FROM orders WHERE order_status != 'delivered' ORDER BY delivery_date ASC, created_at DESC`
    );
    return enrichOrders(rows.map(mapOrder));
  }
  const local = loadLocalDb();
  const orders = local.orders
    .map((o) => mapOrder(o as unknown as Record<string, unknown>))
    .filter((o) => o.orderStatus !== "delivered");
  return enrichOrders(orders);
}

export async function getDeliveredOrders(): Promise<OrderWithMeta[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      `SELECT * FROM orders WHERE order_status = 'delivered' ORDER BY created_at DESC LIMIT 50`
    );
    return enrichOrders(rows.map(mapOrder));
  }
  const local = loadLocalDb();
  const orders = local.orders
    .map((o) => mapOrder(o as unknown as Record<string, unknown>))
    .filter((o) => o.orderStatus === "delivered");
  return enrichOrders(orders);
}

export async function getOrderDashboardStats(): Promise<OrderDashboardStats> {
  const tomorrow = toDateKey(addDaysToDate(new Date(), 1));

  if (isTauri()) {
    const db = await getSqlDb();
    const tomorrowRow = await db.select<{ count: number }>(
      `SELECT COUNT(*) as count FROM orders WHERE delivery_date = ? AND order_status != 'delivered'`,
      [tomorrow]
    );
    const itemsRow = await db.select<{ count: number }>(
      `SELECT COUNT(*) as count FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status != 'delivered'`
    );
    const pendingRow = await db.select<{ total: number }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
       WHERE payment_status = 'unpaid' AND order_status != 'delivered'`
    );
    return {
      tomorrowDeliveries: tomorrowRow[0]?.count ?? 0,
      itemsInShop: itemsRow[0]?.count ?? 0,
      pendingCollection: pendingRow[0]?.total ?? 0,
    };
  }

  const local = loadLocalDb();
  const active = local.orders
    .map((o) => mapOrder(o as unknown as Record<string, unknown>))
    .filter((o) => o.orderStatus !== "delivered");

  return {
    tomorrowDeliveries: active.filter((o) => o.deliveryDate === tomorrow).length,
    itemsInShop: local.orderItems.filter((i) =>
      active.some((o) => o.id === i.orderId)
    ).length,
    pendingCollection: active
      .filter((o) => o.balanceDue > 0)
      .reduce((s, o) => s + o.balanceDue, 0),
  };
}

export async function getOrderPayments(orderId: number): Promise<OrderPayment[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM order_payments WHERE order_id = ? ORDER BY created_at DESC, id DESC",
      [orderId]
    );
    return rows.map(mapOrderPayment);
  }
  return loadLocalDb()
    .orderPayments.filter((p) => p.orderId === orderId)
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.id - a.id
    );
}

export async function addOrderPayment(
  orderId: number,
  amount: number,
  paymentMethod: PaymentMethod
): Promise<OrderPayment> {
  const order = await getOrderById(orderId);
  if (!order) throw new AppError(ErrorCodes.ORDER_NOT_FOUND);

  const payAmount = Math.min(Math.max(0, amount), order.balanceDue);
  if (payAmount <= 0) throw new AppError(ErrorCodes.NO_AMOUNT_DUE);

  const createdAt = new Date().toISOString();
  const payment = await insertOrderPaymentRecord(
    orderId,
    payAmount,
    paymentMethod,
    createdAt
  );

  const amountPaid = order.amountPaid + payAmount;
  const balanceDue = Math.max(0, order.totalAmount - amountPaid);
  const paymentStatus = derivePaymentStatus(
    amountPaid,
    order.totalAmount,
    order.paymentMode as PaymentMode
  );

  await syncOrderPaymentTotals(orderId, {
    amountPaid,
    balanceDue,
    paymentStatus,
    paymentMethod,
  });
  await adjustCustomerCredit(order.customerId, order.customerPhone, -payAmount, {
    orderId,
    entryType: "payment_credit",
    note: "Tahsilat",
  });

  await enqueueOrderSyncById(orderId, true);
  return payment;
}

export async function completeOrderDelivery(
  orderId: number,
  options: {
    amount?: number;
    paymentMethod?: PaymentMethod;
    leaveOnCredit?: boolean;
  } = {}
): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new AppError(ErrorCodes.ORDER_NOT_FOUND);

  if (order.orderStatus === "delivered") return;

  const mustCollect =
    order.paymentMode === "pay_on_delivery" && order.balanceDue > 0;

  if (mustCollect && !options.leaveOnCredit) {
    const amount = options.amount ?? 0;
    if (amount <= 0 || !options.paymentMethod) {
      throw new AppError(ErrorCodes.DELIVERY_PAYMENT_REQUIRED);
    }
    await addOrderPayment(orderId, amount, options.paymentMethod);
  } else if (options.amount && options.amount > 0 && options.paymentMethod) {
    await addOrderPayment(orderId, options.amount, options.paymentMethod);
  }

  await updateOrderOrderStatus(orderId, "delivered");
}

export async function refundOrderPayment(paymentId: number): Promise<void> {
  let payment: OrderPayment | null = null;

  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM order_payments WHERE id = ?",
      [paymentId]
    );
    payment = rows[0] ? mapOrderPayment(rows[0]) : null;
    if (!payment || payment.refunded) throw new AppError(ErrorCodes.PAYMENT_NOT_FOUND);
    await db.execute("UPDATE order_payments SET refunded = 1 WHERE id = ?", [
      paymentId,
    ]);
  } else {
    const local = loadLocalDb();
    payment = local.orderPayments.find((p) => p.id === paymentId) ?? null;
    if (!payment || payment.refunded) throw new AppError(ErrorCodes.PAYMENT_NOT_FOUND);
    payment.refunded = 1;
    saveLocalDb(local);
  }

  const order = await getOrderById(payment.orderId);
  if (!order) return;

  const amountPaid = Math.max(0, order.amountPaid - payment.amount);
  const balanceDue = Math.max(0, order.totalAmount - amountPaid);
  const paymentStatus = derivePaymentStatus(
    amountPaid,
    order.totalAmount,
    order.paymentMode as PaymentMode
  );

  await syncOrderPaymentTotals(payment.orderId, {
    amountPaid,
    balanceDue,
    paymentStatus,
  });
  await adjustCustomerCredit(
    order.customerId,
    order.customerPhone,
    payment.amount,
    {
      orderId: payment.orderId,
      entryType: "adjustment",
      note: "Ödeme iadesi",
    }
  );

  await enqueueOrderSyncById(payment.orderId, true);
}

/** @deprecated use addOrderPayment for partial payments */
export async function updateOrderPaymentStatus(
  orderId: number,
  paymentStatus: PaymentStatus
): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      "UPDATE orders SET payment_status = ? WHERE id = ?",
      [paymentStatus, orderId]
    );
    await enqueueOrderSyncById(orderId, true);
    return;
  }
  const local = loadLocalDb();
  const o = local.orders.find((x) => x.id === orderId);
  if (o) (o as Order).paymentStatus = paymentStatus;
  saveLocalDb(local, { silent: true });
  await enqueueOrderSyncById(orderId, true);
}

export async function updateOrderOrderStatus(
  orderId: number,
  orderStatus: OrderStatus
): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("UPDATE orders SET order_status = ? WHERE id = ?", [
      orderStatus,
      orderId,
    ]);
    await enqueueOrderSyncById(orderId, true);
    return;
  }
  const local = loadLocalDb();
  const o = local.orders.find((x) => x.id === orderId);
  if (o) (o as Order).orderStatus = orderStatus;
  saveLocalDb(local, { silent: true });
  await enqueueOrderSyncById(orderId, true);
}

export async function updateOrderItemStatus(
  itemId: number,
  itemStatus: ItemStatus
): Promise<void> {
  let orderId: number | null = null;

  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<{ order_id: number }>(
      "SELECT order_id FROM order_items WHERE id = ?",
      [itemId]
    );
    orderId = rows[0]?.order_id ?? null;
    if (!orderId) return;
    await db.execute(
      "UPDATE order_items SET item_status = ? WHERE id = ?",
      [itemStatus, itemId]
    );
  } else {
    const local = loadLocalDb();
    const item = local.orderItems.find((i) => i.id === itemId);
    if (!item) return;
    orderId = item.orderId;
    item.itemStatus = itemStatus;
    saveLocalDb(local, { silent: true });
  }

  const order = await getOrderById(orderId);
  if (!order || order.orderStatus === "delivered") {
    await enqueueOrderSyncById(orderId, true);
    return;
  }

  const items = await getOrderItemsForOrder(orderId);
  const nextStatus = deriveOrderStatusFromItems(
    items.map((i) => ({ itemStatus: i.itemStatus as ItemStatus })),
    order.orderStatus as OrderStatus
  );
  if (nextStatus !== order.orderStatus) {
    await updateOrderOrderStatus(orderId, nextStatus);
    return;
  }
  await enqueueOrderSyncById(orderId, true);
}

export async function runGlobalSearch(query: string): Promise<GlobalSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const [active, delivered, customers] = await Promise.all([
    getActiveOrders(),
    getDeliveredOrders(),
    getCustomers(),
  ]);

  const orderHits: GlobalSearchHit[] = [];
  const seenOrders = new Set<number>();
  for (const order of [...active, ...delivered]) {
    if (seenOrders.has(order.id)) continue;
    if (
      orderMatchesGlobalSearch(
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          itemNumbers: order.itemNumbers,
        },
        q
      )
    ) {
      seenOrders.add(order.id);
      orderHits.push({
        kind: "order",
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        orderStatus: order.orderStatus,
      });
    }
  }

  const customerHits: GlobalSearchHit[] = customers
    .filter((c) =>
      customerMatchesGlobalSearch(
        { name: c.name, lastName: c.lastName, phone: c.phone },
        q
      )
    )
    .map((c) => ({
      kind: "customer" as const,
      id: c.id,
      name: c.name,
      lastName: c.lastName,
      phone: c.phone,
    }));

  return rankGlobalSearchHits([...orderHits, ...customerHits], q);
}

export async function getCustomerListMeta(
  customerId: number,
  phone: string
): Promise<CustomerListMeta> {
  const creditDebt = await getCustomerCreditDebt(phone);

  if (isTauri()) {
    const db = await getSqlDb();
    const active = await db.select<{ count: number }>(
      `SELECT COUNT(*) as count FROM orders
       WHERE (customer_id = ? OR customer_phone = ?) AND order_status != 'delivered'`,
      [customerId, phone]
    );
    const pending = await db.select<{ total: number }>(
      `SELECT COALESCE(SUM(balance_due), 0) as total FROM orders
       WHERE (customer_id = ? OR customer_phone = ?) AND balance_due > 0 AND order_status != 'delivered'`,
      [customerId, phone]
    );
    return {
      hasActiveOrders: (active[0]?.count ?? 0) > 0,
      pendingAmount: pending[0]?.total ?? 0,
      creditDebt,
    };
  }

  const local = loadLocalDb();
  const orders = local.orders
    .map((o) => mapOrder(o as unknown as Record<string, unknown>))
    .filter(
      (o) =>
        (o.customerId === customerId || o.customerPhone === phone) &&
        o.orderStatus !== "delivered"
    );
  return {
    hasActiveOrders: orders.length > 0,
    pendingAmount: orders
      .filter((o) => o.balanceDue > 0)
      .reduce((s, o) => s + o.balanceDue, 0),
    creditDebt,
  };
}

// ─── Customer tags ─────────────────────────────────────────────────────────────

export async function getCustomerTags(): Promise<CustomerTag[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM customer_tags ORDER BY id"
    );
    return rows.map(mapCustomerTag);
  }
  return loadLocalDb().customerTags;
}

export async function getCustomerTagById(
  id: number
): Promise<CustomerTag | null> {
  const tags = await getCustomerTags();
  return tags.find((t) => t.id === id) ?? null;
}

export interface CustomerTagInput {
  slug: string;
  label: string;
  color: TagColor;
}

export async function createCustomerTag(
  input: CustomerTagInput
): Promise<CustomerTag> {
  const slug = input.slug.trim().toLowerCase().replace(/\s+/g, "-");
  const label = input.label.trim();
  const color = input.color;

  const globalId = createGlobalId();
  const orgId = getOrganizationId();

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      "INSERT INTO customer_tags (global_id, organization_id, slug, label, color) VALUES (?, ?, ?, ?, ?)",
      [globalId, orgId, slug, label, color]
    );
    const tag: CustomerTag = {
      ...ENTITY_SCOPE_DEFAULTS,
      id: result.lastInsertId,
      globalId,
      organizationId: orgId,
      slug,
      label,
      color,
    };
    await enqueueSyncChange(
      "customer_tag",
      globalId,
      "create",
      customerTagSyncPayload(tag)
    );
    return tag;
  }

  const local = loadLocalDb();
  const tag: CustomerTag = {
    ...ENTITY_SCOPE_DEFAULTS,
    id: local.nextCustomerTagId++,
    globalId,
    organizationId: orgId,
    slug,
    label,
    color,
  };
  local.customerTags.push(tag);
  saveLocalDb(local, { silent: true });
  await enqueueSyncChange(
    "customer_tag",
    globalId,
    "create",
    customerTagSyncPayload(tag)
  );
  return tag;
}

export async function updateCustomerTag(
  id: number,
  input: CustomerTagInput
): Promise<CustomerTag> {
  const slug = input.slug.trim().toLowerCase().replace(/\s+/g, "-");
  const label = input.label.trim();
  const color = input.color;

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      "UPDATE customer_tags SET slug = ?, label = ?, color = ? WHERE id = ?",
      [slug, label, color, id]
    );
    await enqueueCustomerTagSyncById(id);
    return (await getCustomerTagById(id))!;
  }

  const local = loadLocalDb();
  const tag = local.customerTags.find((t) => t.id === id)!;
  tag.slug = slug;
  tag.label = label;
  tag.color = color;
  saveLocalDb(local, { silent: true });
  await enqueueCustomerTagSyncById(id);
  return tag;
}

export async function deleteCustomerTag(id: number): Promise<void> {
  if (id <= 4) {
    throw new AppError(ErrorCodes.DEFAULT_TAGS_LOCKED);
  }

  const tag = await getCustomerTagById(id);
  const globalId = tag ? (await persistCustomerTagScope(tag)).globalId : null;

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("UPDATE customers SET tag_id = 1 WHERE tag_id = ?", [id]);
    await db.execute("DELETE FROM customer_tags WHERE id = ?", [id]);
    if (globalId) {
      await enqueueSyncChange("customer_tag", globalId, "delete", {});
    }
    return;
  }

  const local = loadLocalDb();
  local.customers.forEach((c) => {
    if (c.tagId === id) c.tagId = 1;
  });
  local.customerTags = local.customerTags.filter((t) => t.id !== id);
  saveLocalDb(local, { silent: true });
  if (globalId) {
    await enqueueSyncChange("customer_tag", globalId, "delete", {});
  }
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export async function getCoupons(): Promise<Coupon[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM coupons ORDER BY id DESC"
    );
    return rows.map(mapCoupon);
  }
  return loadLocalDb().coupons;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  active?: boolean;
}

export async function createCoupon(input: CouponInput): Promise<Coupon> {
  const code = input.code.trim().toUpperCase();
  const createdAt = new Date().toISOString();
  const active = input.active !== false ? 1 : 0;
  const value = Math.max(0, input.value);

  const globalId = createGlobalId();
  const orgId = getOrganizationId();

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      "INSERT INTO coupons (global_id, organization_id, code, type, value, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [globalId, orgId, code, input.type, value, active, createdAt]
    );
    const coupon: Coupon = {
      ...ENTITY_SCOPE_DEFAULTS,
      id: result.lastInsertId,
      globalId,
      organizationId: orgId,
      code,
      type: input.type,
      value,
      active,
      createdAt,
    };
    await enqueueSyncChange(
      "coupon",
      globalId,
      "create",
      couponSyncPayload(coupon)
    );
    return coupon;
  }

  const local = loadLocalDb();
  const coupon: Coupon = {
    ...ENTITY_SCOPE_DEFAULTS,
    id: local.nextCouponId++,
    globalId,
    organizationId: orgId,
    code,
    type: input.type,
    value,
    active,
    createdAt,
  };
  local.coupons.push(coupon);
  saveLocalDb(local, { silent: true });
  await enqueueSyncChange(
    "coupon",
    globalId,
    "create",
    couponSyncPayload(coupon)
  );
  return coupon;
}

export async function updateCoupon(
  id: number,
  input: CouponInput
): Promise<Coupon> {
  const code = input.code.trim().toUpperCase();
  const active = input.active !== false ? 1 : 0;
  const value = Math.max(0, input.value);

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      "UPDATE coupons SET code = ?, type = ?, value = ?, active = ? WHERE id = ?",
      [code, input.type, value, active, id]
    );
    await enqueueCouponSyncById(id);
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM coupons WHERE id = ?",
      [id]
    );
    return mapCoupon(rows[0]);
  }

  const local = loadLocalDb();
  const coupon = local.coupons.find((c) => c.id === id)!;
  coupon.code = code;
  coupon.type = input.type;
  coupon.value = value;
  coupon.active = active;
  saveLocalDb(local, { silent: true });
  await enqueueCouponSyncById(id);
  return coupon;
}

export async function deleteCoupon(id: number): Promise<void> {
  const coupon = (await getCoupons()).find((c) => c.id === id);
  const globalId = coupon ? (await persistCouponScope(coupon)).globalId : null;

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM coupons WHERE id = ?", [id]);
    if (globalId) {
      await enqueueSyncChange("coupon", globalId, "delete", {});
    }
    return;
  }
  const local = loadLocalDb();
  local.coupons = local.coupons.filter((c) => c.id !== id);
  saveLocalDb(local, { silent: true });
  if (globalId) {
    await enqueueSyncChange("coupon", globalId, "delete", {});
  }
}

export function calculateCouponDiscount(
  subtotal: number,
  coupon: Coupon
): number {
  if (!coupon.active) return 0;
  if (coupon.type === "percent") {
    return Math.min(subtotal, Math.round(subtotal * (coupon.value / 100)));
  }
  return Math.min(subtotal, coupon.value);
}

export async function validateCouponCode(
  code: string,
  subtotal: number
): Promise<{ coupon: Coupon; discount: number } | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const coupons = await getCoupons();
  const coupon = coupons.find(
    (c) => c.code === normalized && c.active === 1
  );
  if (!coupon) return null;
  const discount = calculateCouponDiscount(subtotal, coupon);
  if (discount <= 0) return null;
  return { coupon, discount };
}

export async function getCustomerCreditDebt(phone: string): Promise<number> {
  const normalized = phone.trim();
  if (!normalized) return 0;
  const customer = await getCustomerByPhone(normalized);
  return customer?.creditBalance ?? 0;
}

async function ensureWhatsappTemplatesSeeded(): Promise<void> {
  const orgId = getOrganizationId() ?? "";
  const now = new Date().toISOString();

  if (isTauri()) {
    const db = await getSqlDb();
    const count = await db.select<{ count: number }>(
      "SELECT COUNT(*) as count FROM whatsapp_templates"
    );
    if ((count[0]?.count ?? 0) > 0) return;
    for (const [slug, tpl] of Object.entries(DEFAULT_WHATSAPP_TEMPLATES)) {
      await db.execute(
        `INSERT INTO whatsapp_templates (
           global_id, organization_id, slug, name, body, active, updated_at
         ) VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [createGlobalId(), orgId, slug, tpl.name, tpl.body, now]
      );
    }
    return;
  }

  const local = loadLocalDb();
  if (local.whatsappTemplates.length > 0) return;
  for (const [slug, tpl] of Object.entries(DEFAULT_WHATSAPP_TEMPLATES)) {
    local.whatsappTemplates.push({
      id: local.nextWhatsappTemplateId++,
      globalId: createGlobalId(),
      organizationId: orgId,
      slug,
      name: tpl.name,
      body: tpl.body,
      active: 1,
      updatedAt: now,
    });
  }
  saveLocalDb(local, { silent: true });
}

export async function getWhatsappTemplates(): Promise<WhatsappTemplate[]> {
  await ensureWhatsappTemplatesSeeded();
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM whatsapp_templates ORDER BY id"
    );
    return rows.map(mapWhatsappTemplate);
  }
  return [...loadLocalDb().whatsappTemplates].sort((a, b) => a.id - b.id);
}

export async function getWhatsappTemplateBySlug(
  slug: string
): Promise<WhatsappTemplate | null> {
  const templates = await getWhatsappTemplates();
  return templates.find((t) => t.slug === slug && t.active === 1) ?? null;
}

export async function updateWhatsappTemplate(
  id: number,
  patch: Partial<Pick<WhatsappTemplate, "name" | "body" | "active">>
): Promise<WhatsappTemplate> {
  const updatedAt = new Date().toISOString();
  let template: WhatsappTemplate | null = null;

  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM whatsapp_templates WHERE id = ?",
      [id]
    );
    template = rows[0] ? mapWhatsappTemplate(rows[0]) : null;
    if (!template) throw new AppError(ErrorCodes.TEMPLATE_NOT_FOUND);
    const next = {
      ...template,
      name: patch.name ?? template.name,
      body: patch.body ?? template.body,
      active: patch.active ?? template.active,
      updatedAt,
    };
    await db.execute(
      "UPDATE whatsapp_templates SET name = ?, body = ?, active = ?, updated_at = ? WHERE id = ?",
      [next.name, next.body, next.active, next.updatedAt, id]
    );
    template = next;
  } else {
    const local = loadLocalDb();
    const row = local.whatsappTemplates.find((t) => t.id === id);
    if (!row) throw new AppError(ErrorCodes.TEMPLATE_NOT_FOUND);
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.body !== undefined) row.body = patch.body;
    if (patch.active !== undefined) row.active = patch.active;
    row.updatedAt = updatedAt;
    saveLocalDb(local, { silent: true });
    template = row;
  }

  if (template.globalId) {
    await enqueueSyncChange(
      "whatsapp_template",
      template.globalId,
      "update",
      whatsappTemplateSyncPayload(template),
      true
    );
  }
  return template;
}

// ─── Organization / Auth sync ────────────────────────────────────────────────

export type { OrganizationInput } from "@cleanledger/shared/organization";
import type { OrganizationInput } from "@cleanledger/shared/organization";

export async function saveOrganizationSettings(
  input: OrganizationInput
): Promise<OrganizationSettings> {
  const updatedAt = new Date().toISOString();
  const email = input.email.trim();
  const existing = await getOrganizationSettings();
  const row = withLogoHash({
    id: existing?.id ?? 1,
    globalId: existing?.globalId ?? createGlobalId(),
    organizationId:
      input.organizationId?.trim() ||
      existing?.organizationId ||
      (email ? normalizeOrganizationId(email) : ""),
    companyName: input.companyName.trim(),
    adminName: input.adminName.trim(),
    email,
    phone: input.phone?.trim() ?? "",
    address: input.address?.trim() ?? "",
    logoDataUrl: input.logoDataUrl ?? existing?.logoDataUrl ?? null,
    logoHash: existing?.logoHash ?? null,
    authToken: input.authToken,
    trialEndsAt: input.trialEndsAt ?? existing?.trialEndsAt ?? "",
    updatedAt,
  });

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM organization_settings");
    const result = await db.execute(
      `INSERT INTO organization_settings (
         global_id, organization_id, company_name, admin_name, email, phone, address,
         logo_data_url, logo_hash, auth_token, trial_ends_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.globalId,
        row.organizationId,
        row.companyName,
        row.adminName,
        row.email,
        row.phone,
        row.address,
        row.logoDataUrl,
        row.logoHash,
        row.authToken,
        row.trialEndsAt,
        row.updatedAt,
      ]
    );
    const saved = { ...row, id: result.lastInsertId };
    setOrganizationProfileCache(saved);
    const orgEntityId = saved.globalId ?? saved.organizationId;
    if (orgEntityId) {
      await enqueueSyncChange(
        "organization_settings",
        orgEntityId,
        "update",
        organizationSyncPayload(saved, existing?.logoHash)
      );
    }
    return saved;
  }

  const local = loadLocalDb();
  local.organizationProfile = { ...row, id: 1 };
  saveLocalDb(local, { silent: true });
  setOrganizationProfileCache(local.organizationProfile);
  const orgEntityId = row.globalId ?? row.organizationId;
  if (orgEntityId) {
    await enqueueSyncChange(
      "organization_settings",
      orgEntityId,
      "update",
      organizationSyncPayload(row, existing?.logoHash)
    );
  }
  return local.organizationProfile;
}

export async function getOrganizationSettings(): Promise<OrganizationSettings | null> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM organization_settings ORDER BY id DESC LIMIT 1"
    );
    if (!rows[0]) {
      setOrganizationProfileCache(null);
      return null;
    }
    const org = mapOrganizationSettings(rows[0]);
    setOrganizationProfileCache(org);
    return org;
  }

  const local = loadLocalDb();
  setOrganizationProfileCache(local.organizationProfile);
  return local.organizationProfile;
}

export async function clearOrganizationSettings(): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM organization_settings");
  }
  const local = loadLocalDb();
  local.organizationProfile = null;
  saveLocalDb(local);
  localStorage.removeItem(ORG_STORAGE_KEY);
  localStorage.removeItem(SHOP_PROFILE_STORAGE_KEY);
}

// ─── Products CRUD ───────────────────────────────────────────────────────────

export interface CreateProductInput {
  name: string;
  iconName: string;
  basePrice: number;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const name = input.name.trim();
  const iconName = input.iconName.trim() || "default";
  const basePrice = Math.max(0, input.basePrice);

  const globalId = createGlobalId();
  const orgId = getOrganizationId();

  if (isTauri()) {
    const db = await getSqlDb();
    const maxRow = await db.select<{ maxOrder: number }>(
      "SELECT COALESCE(MAX(sort_order), -1) as maxOrder FROM products",
    );
    const sortOrder = num(maxRow[0]?.maxOrder, -1) + 1;
    const result = await db.execute(
      "INSERT INTO products (global_id, organization_id, name, icon_name, base_price, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [globalId, orgId, name, iconName, basePrice, sortOrder],
    );
    await seedServicePricesForProduct(result.lastInsertId, basePrice);
    await enqueueProductSyncById(result.lastInsertId, "create");
    return {
      ...ENTITY_SCOPE_DEFAULTS,
      id: result.lastInsertId,
      globalId,
      organizationId: orgId,
      name,
      iconName,
      basePrice,
      sortOrder,
    };
  }

  const local = loadLocalDb();
  const sortOrder =
    local.products.reduce(
      (max, product) => Math.max(max, product.sortOrder ?? 0),
      -1,
    ) + 1;
  const id = local.nextProductId++;
  const product: Product = {
    ...ENTITY_SCOPE_DEFAULTS,
    id,
    globalId,
    organizationId: orgId,
    name,
    iconName,
    basePrice,
    sortOrder,
  };
  local.products.push(product);
  for (const st of SERVICE_TYPES) {
    local.servicePrices.push({
      ...ENTITY_SCOPE_DEFAULTS,
      id: local.nextServicePriceId++,
      productId: id,
      serviceType: st,
      price: defaultPriceForService(basePrice, st),
    });
  }
  saveLocalDb(local, { silent: true });
  await enqueueProductSyncById(id, "create");
  return product;
}

export async function getProductUsageCount(productId: number): Promise<number> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<{ count: number }>(
      "SELECT COUNT(*) as count FROM order_items WHERE product_id = ?",
      [productId],
    );
    return num(rows[0]?.count);
  }
  return loadLocalDb().orderItems.filter((item) => item.productId === productId)
    .length;
}

export async function deleteProduct(productId: number): Promise<void> {
  const usage = await getProductUsageCount(productId);
  if (usage > 0) {
    throw new AppError(ErrorCodes.PRODUCT_IN_USE);
  }

  const product = (await getProducts()).find((p) => p.id === productId);
  const globalId = product
    ? (await persistProductScope(product)).globalId
    : null;

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM products WHERE id = ?", [productId]);
    if (globalId) {
      await enqueueSyncChange("product", globalId, "delete", {});
    }
    return;
  }

  const local = loadLocalDb();
  local.products = local.products.filter((product) => product.id !== productId);
  local.servicePrices = local.servicePrices.filter(
    (price) => price.productId !== productId,
  );
  saveLocalDb(local, { silent: true });
  if (globalId) {
    await enqueueSyncChange("product", globalId, "delete", {});
  }
}

export async function reorderProducts(orderedIds: number[]): Promise<void> {
  if (orderedIds.length === 0) return;

  if (isTauri()) {
    const db = await getSqlDb();
    for (let index = 0; index < orderedIds.length; index++) {
      await db.execute("UPDATE products SET sort_order = ? WHERE id = ?", [
        index,
        orderedIds[index],
      ]);
    }
    for (const id of orderedIds) {
      await enqueueProductSyncById(id);
    }
    return;
  }

  const local = loadLocalDb();
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  for (const product of local.products) {
    const nextOrder = orderMap.get(product.id);
    if (nextOrder !== undefined) {
      product.sortOrder = nextOrder;
    }
  }
  local.products.sort(
    (a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id),
  );
  saveLocalDb(local, { silent: true });
  for (const id of orderedIds) {
    await enqueueProductSyncById(id);
  }
}

// ─── Order items detail ──────────────────────────────────────────────────────

export interface OrderItemDetail extends OrderItem {
  productName: string;
}

export async function getOrderItemsForOrder(
  orderId: number
): Promise<OrderItemDetail[]> {
  const products = await getProducts();
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM order_items WHERE order_id = ? ORDER BY id",
      [orderId]
    );
    return rows.map((row) => {
      const item = mapOrderItem(row);
      return {
        ...item,
        productName: productMap.get(item.productId) ?? "Ürün",
      };
    });
  }

  return loadLocalDb()
    .orderItems.filter((i) => i.orderId === orderId)
    .map((item) => ({
      ...item,
      productName: productMap.get(item.productId) ?? "Ürün",
    }));
}

export async function getOrderByIdPublic(orderId: number): Promise<Order | null> {
  return getOrderById(orderId);
}

export type ReportPeriod = "daily" | "weekly" | "monthly";
export type ReportType = "revenue" | "customers" | "orders";

export interface ReportDateRange {
  start: Date;
  end: Date;
  label: string;
}

export function resolveReportDateRange(
  period: ReportPeriod,
  anchor = new Date()
): ReportDateRange {
  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);

  if (period === "daily") {
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    return {
      start: base,
      end,
      label: base.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    };
  }

  if (period === "weekly") {
    const day = base.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(base);
    start.setDate(base.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      label: `${start.toLocaleDateString("tr-TR")} – ${end.toLocaleDateString("tr-TR")}`,
    };
  }

  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    start,
    end,
    label: start.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
  };
}

async function getAllOrdersSorted(): Promise<Order[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );
    return rows.map(mapOrder);
  }
  return loadLocalDb()
    .orders.map((o) => mapOrder(o as unknown as Record<string, unknown>))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function getOrdersInDateRange(
  range: ReportDateRange
): Promise<Order[]> {
  const orders = await getAllOrdersSorted();
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();
  return orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= startMs && t <= endMs;
  });
}

export interface RevenueReportSummary {
  orderCount: number;
  grossSubtotal: number;
  totalDiscounts: number;
  netRevenue: number;
  collected: number;
  outstanding: number;
  refundedPayments: number;
  catalogSubtotal: number;
  linePriceAdjustments: number;
  adjustedLineCount: number;
}

async function getOrderItemsForOrders(orderIds: number[]): Promise<OrderItem[]> {
  if (!orderIds.length) return [];
  if (isTauri()) {
    const db = await getSqlDb();
    const placeholders = orderIds.map(() => "?").join(",");
    const rows = await db.select<Record<string, unknown>>(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`,
      orderIds
    );
    return rows.map(mapOrderItem);
  }
  const idSet = new Set(orderIds);
  return loadLocalDb().orderItems.filter((i) => idSet.has(i.orderId));
}

export async function getRevenueReportSummary(
  range: ReportDateRange
): Promise<RevenueReportSummary> {
  const orders = await getOrdersInDateRange(range);
  const orderIds = orders.map((o) => o.id);
  const items = await getOrderItemsForOrders(orderIds);
  const lineMetrics = computeLinePriceMetrics(items);
  let refundedPayments = 0;

  if (isTauri()) {
    const db = await getSqlDb();
    const ids = orders.map((o) => o.id);
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      const payments = await db.select<Record<string, unknown>>(
        `SELECT * FROM order_payments WHERE order_id IN (${placeholders}) AND refunded = 1`,
        ids
      );
      refundedPayments = payments.reduce(
        (s, p) => s + Number(p.amount ?? 0),
        0
      );
    }
  } else {
    const local = loadLocalDb();
    const idSet = new Set(orders.map((o) => o.id));
    refundedPayments = local.orderPayments
      .filter((p) => idSet.has(p.orderId) && p.refunded)
      .reduce((s, p) => s + p.amount, 0);
  }

  return {
    orderCount: orders.length,
    grossSubtotal: orders.reduce((s, o) => s + o.subtotalAmount, 0),
    totalDiscounts: orders.reduce((s, o) => s + o.discountAmount, 0),
    netRevenue: orders.reduce((s, o) => s + o.totalAmount, 0),
    collected: orders.reduce((s, o) => s + o.amountPaid, 0),
    outstanding: orders.reduce((s, o) => s + o.balanceDue, 0),
    refundedPayments,
    catalogSubtotal: lineMetrics.catalogSubtotal,
    linePriceAdjustments: lineMetrics.linePriceAdjustments,
    adjustedLineCount: lineMetrics.adjustedLineCount,
  };
}

export interface CustomerReportRow {
  customerId: number | null;
  customerName: string;
  phone: string;
  visitCount: number;
  totalSpent: number;
  lastVisitAt: string;
}

export async function getCustomersReportRows(
  range: ReportDateRange
): Promise<CustomerReportRow[]> {
  const orders = await getOrdersInDateRange(range);
  const customers = await getCustomers();
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const byKey = new Map<string, CustomerReportRow>();

  for (const order of orders) {
    const key = order.customerPhone;
    const existing = byKey.get(key);
    const c = order.customerId ? customerMap.get(order.customerId) : undefined;
    const name =
      (c ? formatCustomerName(c) : undefined) ??
      existing?.customerName ??
      order.customerPhone;

    if (!existing) {
      byKey.set(key, {
        customerId: order.customerId,
        customerName: name,
        phone: order.customerPhone,
        visitCount: 1,
        totalSpent: order.totalAmount,
        lastVisitAt: order.createdAt,
      });
    } else {
      existing.visitCount += 1;
      existing.totalSpent += order.totalAmount;
      if (new Date(order.createdAt) > new Date(existing.lastVisitAt)) {
        existing.lastVisitAt = order.createdAt;
        existing.customerName = name;
      }
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );
}

export interface OrderWorkReportRow {
  order: Order;
  customerName: string;
  items: OrderItemDetail[];
  itemCount: number;
}

export async function getOrderWorkReportRows(
  range: ReportDateRange
): Promise<OrderWorkReportRow[]> {
  const orders = await getOrdersInDateRange(range);
  const enriched = await enrichOrders(orders);
  const rows = await Promise.all(
    enriched.map(async (order) => {
      const items = await getOrderItemsForOrder(order.id);
      return {
        order,
        customerName: order.customerName ?? order.customerPhone,
        items,
        itemCount: items.length,
      };
    })
  );
  return rows.sort(
    (a, b) =>
      new Date(b.order.createdAt).getTime() -
      new Date(a.order.createdAt).getTime()
  );
}

// ─── Cloud sync snapshot ─────────────────────────────────────────────────────

async function buildLocalDbFromTauri(): Promise<LocalDb> {
  const db = await getSqlDb();
  const products = (
    await db.select<Record<string, unknown>>(
      "SELECT * FROM products ORDER BY sort_order ASC, id ASC",
    )
  ).map(mapProduct);
  const customers = (
    await db.select<Record<string, unknown>>("SELECT * FROM customers ORDER BY id")
  ).map(mapCustomer);
  const customerTags = (
    await db.select<Record<string, unknown>>(
      "SELECT * FROM customer_tags ORDER BY id"
    )
  ).map(mapCustomerTag);
  const coupons = (
    await db.select<Record<string, unknown>>("SELECT * FROM coupons ORDER BY id")
  ).map(mapCoupon);
  const servicePrices = (
    await db.select<Record<string, unknown>>("SELECT * FROM service_prices ORDER BY id")
  ).map(mapServicePrice);
  const orders = (
    await db.select<Record<string, unknown>>("SELECT * FROM orders ORDER BY id")
  ).map(mapOrder);
  const orderItems = (
    await db.select<Record<string, unknown>>("SELECT * FROM order_items ORDER BY id")
  ).map(mapOrderItem);
  const orderPayments = (
    await db.select<Record<string, unknown>>(
      "SELECT * FROM order_payments ORDER BY id"
    )
  ).map(mapOrderPayment);
  const orgRows = await db.select<Record<string, unknown>>(
    "SELECT * FROM organization_settings ORDER BY id DESC LIMIT 1"
  );
  const organizationProfile = orgRows[0]
    ? mapOrganizationSettings(orgRows[0])
    : null;
  const syncRows = await db.select<Record<string, unknown>>(
    "SELECT * FROM sync_queue ORDER BY client_updated_at"
  );
  const syncQueue = syncRows.map((row) => {
    const mapped = mapSyncQueueRow(row);
    return {
      ...mapped,
      entityType: mapped.entityType as SyncEntityType,
      operation: mapped.operation as SyncOperation,
    };
  });
  const creditLedger = (
    await db.select<Record<string, unknown>>(
      "SELECT * FROM credit_ledger ORDER BY id"
    )
  ).map(mapCreditLedger);
  const creditResets = (
    await db.select<Record<string, unknown>>(
      "SELECT * FROM credit_resets ORDER BY id"
    )
  ).map(mapCreditReset);
  const auditLog = (
    await db.select<Record<string, unknown>>(
      "SELECT * FROM audit_log ORDER BY id"
    )
  ).map(mapAuditLog);
  const whatsappTemplates = (
    await db.select<Record<string, unknown>>(
      "SELECT * FROM whatsapp_templates ORDER BY id"
    )
  ).map(mapWhatsappTemplate);

  let productColorPalette: ProductColorPreset[];
  try {
    const paletteRows = await db.select<{ label: string; hex: string }>(
      "SELECT label, hex FROM product_color_palette ORDER BY sort_order ASC, id ASC"
    );
    productColorPalette = paletteRows.length
      ? paletteRows.map((r) => ({ label: r.label, hex: r.hex }))
      : cloneDefaultProductColorPalette();
  } catch {
    productColorPalette = cloneDefaultProductColorPalette();
  }

  const maxId = (arr: { id: number }[], fallback: number) =>
    arr.length ? Math.max(...arr.map((x) => x.id)) + 1 : fallback;

  return {
    schemaVersion: LOCAL_DB_SCHEMA_VERSION,
    products,
    customers,
    customerTags: customerTags.length ? customerTags : seedDefaultTags(),
    coupons,
    servicePrices,
    orders,
    orderItems,
    orderPayments,
    organizationProfile,
    creditLedger,
    creditResets,
    auditLog,
    whatsappTemplates,
    syncQueue,
    orderNumberSequences: [],
    productColorPalette,
    nextProductId: maxId(products, 1),
    nextCustomerId: maxId(customers, 1),
    nextCustomerTagId: maxId(customerTags, 5),
    nextCouponId: maxId(coupons, 1),
    nextServicePriceId: maxId(servicePrices, 1),
    nextOrderId: maxId(orders, 1),
    nextOrderItemId: maxId(orderItems, 1),
    nextOrderPaymentId: maxId(orderPayments, 1),
    nextOrderNumber: orders.length + 1,
    nextCreditLedgerId: maxId(creditLedger, 1),
    nextCreditResetId: maxId(creditResets, 1),
    nextAuditLogId: maxId(auditLog, 1),
    nextWhatsappTemplateId: maxId(whatsappTemplates, 1),
  };
}

async function applyLocalDbToTauri(data: LocalDb): Promise<void> {
  const db = await getSqlDb();
  await db.execute("DELETE FROM order_items");
  await db.execute("DELETE FROM order_payments");
  await db.execute("DELETE FROM orders");
  await db.execute("DELETE FROM credit_ledger");
  await db.execute("DELETE FROM credit_resets");
  await db.execute("DELETE FROM audit_log");
  await db.execute("DELETE FROM whatsapp_templates");
  await db.execute("DELETE FROM service_prices");
  await db.execute("DELETE FROM customers");
  await db.execute("DELETE FROM coupons");
  await db.execute("DELETE FROM customer_tags");
  await db.execute("DELETE FROM products");
  await db.execute("DELETE FROM product_color_palette");

  for (let pi = 0; pi < (data.productColorPalette ?? cloneDefaultProductColorPalette()).length; pi++) {
    const preset = (data.productColorPalette ?? cloneDefaultProductColorPalette())[pi];
    await db.execute(
      "INSERT INTO product_color_palette (label, hex, sort_order) VALUES (?, ?, ?)",
      [preset.label, preset.hex, pi]
    );
  }

  for (const t of data.customerTags ?? seedDefaultTags()) {
    await db.execute(
      "INSERT INTO customer_tags (id, slug, label, color) VALUES (?, ?, ?, ?)",
      [t.id, t.slug, t.label, t.color]
    );
  }
  for (const cp of data.coupons ?? []) {
    await db.execute(
      "INSERT INTO coupons (id, code, type, value, active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [cp.id, cp.code, cp.type, cp.value, cp.active, cp.createdAt]
    );
  }
  for (const p of data.products) {
    await db.execute(
      "INSERT INTO products (id, name, icon_name, base_price, sort_order) VALUES (?, ?, ?, ?, ?)",
      [p.id, p.name, p.iconName, p.basePrice, p.sortOrder ?? p.id],
    );
  }
  for (const c of data.customers) {
    await db.execute(
      `INSERT INTO customers (id, name, last_name, phone, notes, address, tag_id, credit_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.name,
        c.lastName ?? "",
        c.phone,
        c.notes ?? "",
        c.address ?? "",
        c.tagId ?? 1,
        c.creditBalance ?? 0,
        c.createdAt,
        c.updatedAt,
      ]
    );
  }
  for (const sp of data.servicePrices) {
    await db.execute(
      "INSERT INTO service_prices (id, product_id, service_type, price) VALUES (?, ?, ?, ?)",
      [sp.id, sp.productId, sp.serviceType, sp.price]
    );
  }
  if (data.organizationProfile) {
    await db.execute("DELETE FROM organization_settings");
    const org = data.organizationProfile;
    const orgRow = withLogoHash(org);
    await db.execute(
      `INSERT INTO organization_settings (
         id, global_id, organization_id, company_name, admin_name, email, phone, address,
         logo_data_url, logo_hash, auth_token, trial_ends_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orgRow.id,
        orgRow.globalId,
        orgRow.organizationId,
        orgRow.companyName,
        orgRow.adminName,
        orgRow.email,
        orgRow.phone ?? "",
        orgRow.address ?? "",
        orgRow.logoDataUrl,
        orgRow.logoHash,
        orgRow.authToken,
        orgRow.trialEndsAt,
        orgRow.updatedAt,
      ]
    );
  }

  for (const o of data.orders) {
    await db.execute(
      `INSERT INTO orders (
         id, global_id, organization_id, order_number, customer_id, customer_phone,
         subtotal_amount, discount_amount, total_amount, amount_paid, balance_due,
         payment_method, payment_mode, coupon_code, payment_status, order_status,
         delivery_date, priority, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o.id,
        o.globalId,
        o.organizationId,
        o.orderNumber,
        o.customerId,
        o.customerPhone,
        o.subtotalAmount ?? o.totalAmount,
        o.discountAmount ?? 0,
        o.totalAmount,
        o.amountPaid ?? (o.paymentStatus === "paid" ? o.totalAmount : 0),
        o.balanceDue ?? 0,
        o.paymentMethod ?? "cash",
        o.paymentMode ?? o.paymentMethod ?? "cash",
        o.couponCode,
        o.paymentStatus,
        o.orderStatus,
        o.deliveryDate,
        o.priority ?? "normal",
        o.createdAt,
      ]
    );
  }
  for (const i of data.orderItems) {
    await db.execute(
      `INSERT INTO order_items (
         id, global_id, organization_id, order_id, product_id, item_number,
         service_type, quantity, original_price, sale_price, subtotal, item_status, color
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        i.id,
        i.globalId,
        i.organizationId,
        i.orderId,
        i.productId,
        i.itemNumber ?? "",
        i.serviceType,
        i.quantity ?? 1,
        i.originalPrice ?? i.subtotal,
        i.salePrice ?? i.subtotal,
        i.subtotal,
        i.itemStatus ?? "received",
        i.color ?? null,
      ]
    );
  }
  for (const p of data.orderPayments ?? []) {
    await db.execute(
      `INSERT INTO order_payments (id, order_id, amount, payment_method, created_at, refunded)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.orderId,
        p.amount,
        p.paymentMethod,
        p.createdAt,
        p.refunded ?? 0,
      ]
    );
  }
  for (const entry of data.creditLedger ?? []) {
    await db.execute(
      `INSERT INTO credit_ledger (
         id, global_id, organization_id, customer_id, order_id, reset_id,
         entry_type, amount, balance_after, note, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.globalId,
        entry.organizationId,
        entry.customerId,
        entry.orderId,
        entry.resetId,
        entry.entryType,
        entry.amount,
        entry.balanceAfter,
        entry.note ?? "",
        entry.createdAt,
      ]
    );
  }
  for (const reset of data.creditResets ?? []) {
    await db.execute(
      `INSERT INTO credit_resets (
         id, global_id, organization_id, customer_id, amount_reset, reset_at, undone_at, note
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reset.id,
        reset.globalId,
        reset.organizationId,
        reset.customerId,
        reset.amountReset,
        reset.resetAt,
        reset.undoneAt,
        reset.note ?? "",
      ]
    );
  }
  for (const log of data.auditLog ?? []) {
    await db.execute(
      `INSERT INTO audit_log (
         id, global_id, organization_id, entity_type, entity_global_id,
         action, payload, actor_email, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.globalId,
        log.organizationId,
        log.entityType,
        log.entityGlobalId,
        log.action,
        log.payload ?? "{}",
        log.actorEmail,
        log.createdAt,
      ]
    );
  }
  for (const tpl of data.whatsappTemplates ?? []) {
    await db.execute(
      `INSERT INTO whatsapp_templates (
         id, global_id, organization_id, slug, name, body, active, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tpl.id,
        tpl.globalId,
        tpl.organizationId,
        tpl.slug,
        tpl.name,
        tpl.body,
        tpl.active ?? 1,
        tpl.updatedAt,
      ]
    );
  }
}


export type { SyncQueueEntry };

async function persistProductScope(product: Product): Promise<Product> {
  const orgId = getOrganizationId();
  const globalId = product.globalId ?? createGlobalId();
  const organizationId = product.organizationId ?? orgId;
  if (product.globalId === globalId && product.organizationId === organizationId) {
    return product;
  }
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      "UPDATE products SET global_id = ?, organization_id = ? WHERE id = ?",
      [globalId, organizationId, product.id]
    );
  } else {
    const local = loadLocalDb();
    const row = local.products.find((p) => p.id === product.id);
    if (row) {
      row.globalId = globalId;
      row.organizationId = organizationId;
      saveLocalDb(local, { silent: true });
    }
  }
  return { ...product, globalId, organizationId };
}

async function persistCouponScope(coupon: Coupon): Promise<Coupon> {
  const orgId = getOrganizationId();
  const globalId = coupon.globalId ?? createGlobalId();
  const organizationId = coupon.organizationId ?? orgId;
  if (coupon.globalId === globalId && coupon.organizationId === organizationId) {
    return coupon;
  }
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      "UPDATE coupons SET global_id = ?, organization_id = ? WHERE id = ?",
      [globalId, organizationId, coupon.id]
    );
  } else {
    const local = loadLocalDb();
    const row = local.coupons.find((c) => c.id === coupon.id);
    if (row) {
      row.globalId = globalId;
      row.organizationId = organizationId;
      saveLocalDb(local, { silent: true });
    }
  }
  return { ...coupon, globalId, organizationId };
}

async function persistCustomerTagScope(tag: CustomerTag): Promise<CustomerTag> {
  const orgId = getOrganizationId();
  const globalId = tag.globalId ?? createGlobalId();
  const organizationId = tag.organizationId ?? orgId;
  if (tag.globalId === globalId && tag.organizationId === organizationId) {
    return tag;
  }
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      "UPDATE customer_tags SET global_id = ?, organization_id = ? WHERE id = ?",
      [globalId, organizationId, tag.id]
    );
  } else {
    const local = loadLocalDb();
    const row = local.customerTags.find((t) => t.id === tag.id);
    if (row) {
      row.globalId = globalId;
      row.organizationId = organizationId;
      saveLocalDb(local, { silent: true });
    }
  }
  return { ...tag, globalId, organizationId };
}

async function persistServicePriceScope(
  servicePrice: ServicePrice
): Promise<ServicePrice> {
  const orgId = getOrganizationId();
  const globalId = servicePrice.globalId ?? createGlobalId();
  const organizationId = servicePrice.organizationId ?? orgId;
  if (
    servicePrice.globalId === globalId &&
    servicePrice.organizationId === organizationId
  ) {
    return servicePrice;
  }
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      "UPDATE service_prices SET global_id = ?, organization_id = ? WHERE id = ?",
      [globalId, organizationId, servicePrice.id]
    );
  } else {
    const local = loadLocalDb();
    const row = local.servicePrices.find((sp) => sp.id === servicePrice.id);
    if (row) {
      row.globalId = globalId;
      row.organizationId = organizationId;
      saveLocalDb(local, { silent: true });
    }
  }
  return { ...servicePrice, globalId, organizationId };
}

async function getServicePricesForProduct(
  productId: number
): Promise<ServicePrice[]> {
  return (await getServicePrices()).filter((sp) => sp.productId === productId);
}

async function enqueueProductSyncById(
  productId: number,
  operation: SyncOperation = "update",
  immediate = false
): Promise<void> {
  const product = (await getProducts()).find((p) => p.id === productId);
  if (!product) return;
  const scoped = await persistProductScope(product);
  if (!scoped.globalId) {
    triggerSyncPush(immediate);
    return;
  }
  const prices = await getServicePricesForProduct(productId);
  const scopedPrices = await Promise.all(
    prices.map((price) => persistServicePriceScope(price))
  );
  await enqueueSyncChange(
    "product",
    scoped.globalId,
    operation,
    productSyncPayload(scoped, scopedPrices),
    immediate
  );
}

async function enqueueCouponSyncById(
  couponId: number,
  operation: SyncOperation = "update",
  immediate = false
): Promise<void> {
  const coupon = (await getCoupons()).find((c) => c.id === couponId);
  if (!coupon) return;
  const scoped = await persistCouponScope(coupon);
  if (!scoped.globalId) {
    triggerSyncPush(immediate);
    return;
  }
  await enqueueSyncChange(
    "coupon",
    scoped.globalId,
    operation,
    couponSyncPayload(scoped),
    immediate
  );
}

async function enqueueCustomerTagSyncById(
  tagId: number,
  operation: SyncOperation = "update",
  immediate = false
): Promise<void> {
  const tag = await getCustomerTagById(tagId);
  if (!tag) return;
  const scoped = await persistCustomerTagScope(tag);
  if (!scoped.globalId) {
    triggerSyncPush(immediate);
    return;
  }
  await enqueueSyncChange(
    "customer_tag",
    scoped.globalId,
    operation,
    customerTagSyncPayload(scoped),
    immediate
  );
}

async function enqueueServicePriceSync(
  productId: number,
  serviceType: ServiceType,
  immediate = false
): Promise<void> {
  const product = (await getProducts()).find((p) => p.id === productId);
  if (!product) {
    triggerSyncPush(immediate);
    return;
  }
  const scopedProduct = await persistProductScope(product);
  if (!scopedProduct.globalId) {
    triggerSyncPush(immediate);
    return;
  }
  const servicePrice = (await getServicePricesForProduct(productId)).find(
    (sp) => sp.serviceType === serviceType
  );
  if (!servicePrice) {
    triggerSyncPush(immediate);
    return;
  }
  const scopedPrice = await persistServicePriceScope(servicePrice);
  if (!scopedPrice.globalId) {
    triggerSyncPush(immediate);
    return;
  }
  await enqueueSyncChange(
    "service_price",
    scopedPrice.globalId,
    "update",
    servicePriceSyncPayload(scopedPrice, scopedProduct.globalId),
    immediate
  );
}

async function enqueueOrderSyncById(
  orderId: number,
  immediate = false
): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order?.globalId) {
    triggerSyncPush(immediate);
    return;
  }
  const items = await getOrderItemsForOrder(orderId);
  const payments = await getOrderPayments(orderId);
  await enqueueSyncChange(
    "order",
    order.globalId,
    "update",
    orderSyncPayload(order, items, payments),
    immediate
  );
}

export function getOrganizationId(): string | null {
  const active = activeSqliteOrgId?.trim().toLowerCase();
  if (active) return active;
  if (isTauri()) {
    return organizationProfileCache?.organizationId?.trim().toLowerCase() || null;
  }
  return loadLocalDb().organizationProfile?.organizationId?.trim().toLowerCase() || null;
}

async function readTauriSyncQueue(): Promise<SyncQueueEntry[]> {
  const orgId = requireActiveSqliteOrgId();
  const db = await getSqlDb();
  const rows = await db.select<Record<string, unknown>>(
    "SELECT * FROM sync_queue WHERE synced_at IS NULL AND organization_id = ? ORDER BY client_updated_at",
    [orgId]
  );
  return rows.map((row) => {
    const mapped = mapSyncQueueRow(row);
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(mapped.payload || "{}") as Record<string, unknown>;
    } catch {
      payload = {};
    }
    return {
      id: mapped.id,
      organizationId: mapped.organizationId,
      entityType: mapped.entityType as SyncEntityType,
      entityGlobalId: mapped.entityGlobalId,
      operation: mapped.operation as SyncOperation,
      payload,
      clientUpdatedAt: mapped.clientUpdatedAt,
      syncedAt: mapped.syncedAt,
    };
  });
}

async function writeTauriSyncQueueEntry(entry: SyncQueueEntry): Promise<void> {
  const db = await getSqlDb();
  const existing = await db.select<{ id: string }>(
    `SELECT id FROM sync_queue WHERE entity_type = ? AND entity_global_id = ? AND synced_at IS NULL LIMIT 1`,
    [entry.entityType, entry.entityGlobalId]
  );
  const entryId = existing[0]?.id ?? entry.id;
  await db.execute(
    `DELETE FROM sync_queue WHERE entity_type = ? AND entity_global_id = ? AND synced_at IS NULL`,
    [entry.entityType, entry.entityGlobalId]
  );
  await db.execute(
    `INSERT INTO sync_queue (id, organization_id, entity_type, entity_global_id, operation, payload, client_updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      entryId,
      entry.organizationId,
      entry.entityType,
      entry.entityGlobalId,
      entry.operation,
      JSON.stringify(entry.payload),
      entry.clientUpdatedAt,
    ]
  );
}

export async function getPendingSyncChanges(): Promise<SyncQueueEntry[]> {
  if (isTauri()) return readTauriSyncQueue();
  return getPendingSyncQueue(loadLocalDb());
}

export async function getPendingSyncCount(): Promise<number> {
  return (await getPendingSyncChanges()).length;
}

export async function enqueueSyncChange(
  entityType: SyncEntityType,
  entityGlobalId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
  immediate = false
): Promise<void> {
  const organizationId = getOrganizationId();
  if (!organizationId || !entityGlobalId) {
    triggerSyncPush(immediate);
    return;
  }

  const clientUpdatedAt = new Date().toISOString();
  if (isTauri()) {
    const entry: SyncQueueEntry = {
      id: createGlobalId(),
      organizationId,
      entityType,
      entityGlobalId,
      operation,
      payload,
      clientUpdatedAt,
      syncedAt: null,
    };
    await writeTauriSyncQueueEntry(entry);
  } else {
    const updated = upsertSyncQueueEntry(loadLocalDb(), {
      organizationId,
      entityType,
      entityGlobalId,
      operation,
      payload,
      clientUpdatedAt,
    });
    saveLocalDb(updated, { silent: true });
  }
  triggerSyncPush(immediate);
}

export async function markSyncChangesSynced(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const syncedAt = new Date().toISOString();
  if (isTauri()) {
    const db = await getSqlDb();
    for (const id of ids) {
      await db.execute(`UPDATE sync_queue SET synced_at = ? WHERE id = ?`, [
        syncedAt,
        id,
      ]);
    }
    return;
  }
  saveLocalDb(markSyncQueueSynced(loadLocalDb(), ids, syncedAt), { silent: true });
}

export async function applyRemoteSyncChanges(
  changes: SyncQueueEntry[]
): Promise<void> {
  if (!changes.length) return;
  const orgId = getOrganizationId();
  const scopedChanges = orgId
    ? changes.filter((c) => entityBelongsToTenant(c, orgId))
    : [];
  if (!scopedChanges.length) return;
  if (isTauri()) {
    const data = await buildLocalDbFromTauri();
    const merged = applySyncChanges(data, scopedChanges);
    await applyLocalDbToTauri(merged);
    window.dispatchEvent(new Event("cleanledger-sync"));
    return;
  }
  const merged = applySyncChanges(loadLocalDb(), scopedChanges);
  saveLocalDb(merged);
}

export async function exportDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  const data = isTauri() ? await buildLocalDbFromTauri() : loadLocalDb();
  return {
    version: LOCAL_DB_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data,
  };
}

export async function importDatabaseSnapshot(
  snapshot: DatabaseSnapshot
): Promise<void> {
  const { db: data, warnings } = safeMigrateRecordToV4(snapshot.data);
  if (warnings.length) {
    console.warn("[CleanLedger] Snapshot import uyarıları:", warnings);
  }
  const tenantId = getOrganizationId() ?? activeSqliteOrgId;
  const scoped = tenantId ? isolateLocalDbForTenant(data, tenantId) : data;
  if (isTauri()) {
    await applyLocalDbToTauri(scoped);
    triggerSyncPush();
    return;
  }
  saveLocalDb(scoped);
}
