import type {
  CustomerTag,
  OrderItem,
  OrganizationSettings,
  WhatsappTemplate,
} from "../schema/index";
import { DEFAULT_CUSTOMER_TAGS } from "../schema/index";
import { DEFAULT_WHATSAPP_TEMPLATES } from "../templates/engine";
import { cloneDefaultProductColorPalette } from "../colors/product-palette";
import { formatItemNumber } from "../numbering/order-numbers";
import type { LocalDb } from "../schema/local-db";
import { LOCAL_DB_SCHEMA_VERSION } from "../schema/local-db";
import {
  mapCustomer,
  mapOrder,
  mapOrderItem,
  mapOrganizationSettings,
  num,
} from "../schema/mappers";
import { normalizeOrganizationId } from "../organization/profile";
import { createGlobalId } from "../ids/global-id";
import { withLogoHash } from "../sync/organization-asset";
import {
  customerSchema,
  orderItemSchema,
  orderSchema,
} from "../schema/zod";
import type { z } from "zod";

export {
  WEB_STORAGE_KEY_V2,
  WEB_STORAGE_KEY_V3,
  LEGACY_WEB_STORAGE_KEY,
  ORG_STORAGE_KEY,
  SHOP_PROFILE_STORAGE_KEY,
} from "../platform/storage-keys";

export interface LegacyShopProfile {
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoDataUrl?: string;
}

export interface MigrationResult {
  db: LocalDb;
  warnings: string[];
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

export function emptyLocalDb(): LocalDb {
  const tags = seedDefaultTags();
  return {
    schemaVersion: LOCAL_DB_SCHEMA_VERSION,
    products: [],
    customers: [],
    customerTags: tags,
    coupons: [],
    servicePrices: [],
    orders: [],
    orderItems: [],
    orderPayments: [],
    organizationProfile: null,
    creditLedger: [],
    creditResets: [],
    auditLog: [],
    whatsappTemplates: [],
    syncQueue: [],
    orderNumberSequences: [],
    productColorPalette: cloneDefaultProductColorPalette(),
    nextProductId: 1,
    nextCustomerId: 1,
    nextCustomerTagId: tags.length + 1,
    nextCouponId: 1,
    nextServicePriceId: 1,
    nextOrderId: 1,
    nextOrderItemId: 1,
    nextOrderPaymentId: 1,
    nextOrderNumber: 1,
    nextCreditLedgerId: 1,
    nextCreditResetId: 1,
    nextAuditLogId: 1,
    nextWhatsappTemplateId: 1,
  };
}

export function mergeOrganizationProfile(
  orgFromStorage: OrganizationSettings | null,
  shopProfile: LegacyShopProfile | null
): OrganizationSettings | null {
  if (!orgFromStorage && !shopProfile) return null;

  const email = (orgFromStorage?.email || shopProfile?.email || "").trim();
  const companyName = (
    orgFromStorage?.companyName ||
    shopProfile?.companyName ||
    "CleanLedger"
  ).trim();

  const base: OrganizationSettings = orgFromStorage ?? {
    id: 1,
    globalId: null,
    organizationId: email ? normalizeOrganizationId(email) : "",
    companyName,
    adminName: "",
    email,
    phone: "",
    address: "",
    logoDataUrl: null,
    logoHash: null,
    authToken: "",
    trialEndsAt: "",
    updatedAt: new Date().toISOString(),
  };

  const merged: OrganizationSettings = {
    ...base,
    globalId: base.globalId ?? createGlobalId(),
    organizationId:
      base.organizationId || (email ? normalizeOrganizationId(email) : ""),
    companyName,
    phone: (shopProfile?.phone || base.phone || "").trim(),
    address: (shopProfile?.address || base.address || "").trim(),
    email,
    logoDataUrl: shopProfile?.logoDataUrl ?? base.logoDataUrl ?? null,
    updatedAt: base.updatedAt || new Date().toISOString(),
  };

  return withLogoHash(merged, merged.logoDataUrl);
}

function seedWhatsappTemplates(
  organizationId: string,
  startId: number
): { templates: WhatsappTemplate[]; nextId: number } {
  const now = new Date().toISOString();
  let id = startId;
  const templates = Object.entries(DEFAULT_WHATSAPP_TEMPLATES).map(
    ([slug, tpl]) => ({
      id: id++,
      globalId: createGlobalId(),
      organizationId,
      slug,
      name: tpl.name,
      body: tpl.body,
      active: 1,
      updatedAt: now,
    })
  );
  return { templates, nextId: id };
}

function backfillOrderItems(db: LocalDb): void {
  const itemsByOrder = new Map<number, OrderItem[]>();
  for (const item of db.orderItems) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  db.orderItems = db.orderItems.map((item) => {
    const price = item.salePrice ?? item.subtotal;
    const original = item.originalPrice ?? price;
    const order = db.orders.find((o) => o.id === item.orderId);
    const orderItems = itemsByOrder.get(item.orderId) ?? [];
    const index = orderItems.findIndex((x) => x.id === item.id);
    const itemNumber =
      item.itemNumber ||
      (order?.orderNumber && index >= 0
        ? formatItemNumber(order.orderNumber, index + 1)
        : "");

    return {
      ...item,
      globalId: item.globalId ?? createGlobalId(),
      organizationId:
        item.organizationId ??
        order?.organizationId ??
        db.organizationProfile?.organizationId ??
        null,
      itemNumber,
      quantity: item.quantity ?? 1,
      originalPrice: original,
      salePrice: price,
      subtotal: item.subtotal ?? price,
      itemStatus: item.itemStatus ?? "received",
    };
  });
}

function backfillOrders(db: LocalDb): void {
  const orgId = db.organizationProfile?.organizationId ?? null;
  db.orders = db.orders.map((order) => ({
    ...order,
    globalId: order.globalId ?? createGlobalId(),
    organizationId: order.organizationId ?? orgId,
    paymentMode: order.paymentMode ?? order.paymentMethod ?? "cash",
  }));
}

function safeMapArray<T>(
  items: unknown,
  mapper: (row: Record<string, unknown>) => T,
  warnings: string[],
  label: string,
  schema?: z.ZodType<unknown>
): T[] {
  if (!Array.isArray(items)) return [];
  const out: T[] = [];
  items.forEach((item, index) => {
    try {
      if (!item || typeof item !== "object") {
        warnings.push(`${label}[${index}] geçersiz kayıt atlandı`);
        return;
      }
      const mapped = mapper(item as Record<string, unknown>);
      if (schema) {
        const check = schema.safeParse(mapped);
        if (!check.success) {
          warnings.push(`${label}[${index}] doğrulama hatası — kayıt atlandı`);
          return;
        }
        out.push(check.data as T);
        return;
      }
      out.push(mapped);
    } catch {
      warnings.push(`${label}[${index}] eşleme hatası — kayıt atlandı`);
    }
  });
  return out;
}

export function migrateRecordToV3(
  parsed: Record<string, unknown>,
  warnings: string[] = []
): LocalDb {
  const base = emptyLocalDb();
  const schemaVersion = num(parsed.schemaVersion, 2);

  const merged: LocalDb = {
    ...base,
    schemaVersion: LOCAL_DB_SCHEMA_VERSION,
    products: Array.isArray(parsed.products)
      ? (parsed.products as LocalDb["products"])
      : [],
    customers: safeMapArray(
      parsed.customers,
      mapCustomer,
      warnings,
      "customers",
      customerSchema
    ),
    customerTags:
      Array.isArray(parsed.customerTags) && parsed.customerTags.length
        ? (parsed.customerTags as CustomerTag[])
        : base.customerTags,
    coupons: Array.isArray(parsed.coupons) ? (parsed.coupons as LocalDb["coupons"]) : [],
    servicePrices: Array.isArray(parsed.servicePrices)
      ? (parsed.servicePrices as LocalDb["servicePrices"])
      : [],
    orders: safeMapArray(parsed.orders, mapOrder, warnings, "orders", orderSchema),
    orderItems: safeMapArray(
      parsed.orderItems,
      mapOrderItem,
      warnings,
      "orderItems",
      orderItemSchema
    ),
    orderPayments: Array.isArray(parsed.orderPayments)
      ? (parsed.orderPayments as LocalDb["orderPayments"])
      : [],
    organizationProfile: null,
    creditLedger: Array.isArray(parsed.creditLedger)
      ? (parsed.creditLedger as LocalDb["creditLedger"])
      : [],
    creditResets: Array.isArray(parsed.creditResets)
      ? (parsed.creditResets as LocalDb["creditResets"])
      : [],
    auditLog: Array.isArray(parsed.auditLog)
      ? (parsed.auditLog as LocalDb["auditLog"])
      : [],
    whatsappTemplates: Array.isArray(parsed.whatsappTemplates)
      ? (parsed.whatsappTemplates as LocalDb["whatsappTemplates"])
      : [],
    syncQueue: Array.isArray(parsed.syncQueue)
      ? (parsed.syncQueue as LocalDb["syncQueue"])
      : [],
    orderNumberSequences: Array.isArray(parsed.orderNumberSequences)
      ? (parsed.orderNumberSequences as LocalDb["orderNumberSequences"])
      : [],
    productColorPalette:
      Array.isArray(parsed.productColorPalette) &&
      parsed.productColorPalette.length
        ? (parsed.productColorPalette as LocalDb["productColorPalette"])
        : base.productColorPalette,
    nextProductId: num(parsed.nextProductId, 1),
    nextCustomerId: num(parsed.nextCustomerId, 1),
    nextCustomerTagId: num(parsed.nextCustomerTagId, base.nextCustomerTagId),
    nextCouponId: num(parsed.nextCouponId, 1),
    nextServicePriceId: num(parsed.nextServicePriceId, 1),
    nextOrderId: num(parsed.nextOrderId, 1),
    nextOrderItemId: num(parsed.nextOrderItemId, 1),
    nextOrderPaymentId: num(parsed.nextOrderPaymentId, 1),
    nextOrderNumber: num(parsed.nextOrderNumber, 1),
    nextCreditLedgerId: num(parsed.nextCreditLedgerId, 1),
    nextCreditResetId: num(parsed.nextCreditResetId, 1),
    nextAuditLogId: num(parsed.nextAuditLogId, 1),
    nextWhatsappTemplateId: num(parsed.nextWhatsappTemplateId, 1),
  };

  try {
    if (parsed.organizationProfile && typeof parsed.organizationProfile === "object") {
      merged.organizationProfile = withLogoHash(
        mapOrganizationSettings(parsed.organizationProfile as Record<string, unknown>)
      );
    }
  } catch {
    warnings.push("organizationProfile okunamadı — varsayılan profil kullanılacak");
    merged.organizationProfile = null;
  }

  if (schemaVersion < LOCAL_DB_SCHEMA_VERSION) {
    backfillOrders(merged);
    backfillOrderItems(merged);

    if (merged.organizationProfile?.organizationId) {
      const { templates, nextId } = seedWhatsappTemplates(
        merged.organizationProfile.organizationId,
        merged.nextWhatsappTemplateId
      );
      if (!merged.whatsappTemplates.length) {
        merged.whatsappTemplates = templates;
        merged.nextWhatsappTemplateId = nextId;
      }
    }
  }

  if (merged.organizationProfile) {
    merged.organizationProfile = withLogoHash(merged.organizationProfile);
  }

  return merged;
}

/** Bozuk/eksik veride tam çöküş yerine kısmi kurtarma + uyarı listesi. */
export function safeMigrateRecordToV3(parsed: unknown): MigrationResult {
  const warnings: string[] = [];

  if (!parsed || typeof parsed !== "object") {
    warnings.push("Geçersiz kök veri — boş veritabanı oluşturuldu");
    return { db: emptyLocalDb(), warnings };
  }

  try {
    return {
      db: migrateRecordToV3(parsed as Record<string, unknown>, warnings),
      warnings,
    };
  } catch (err) {
    warnings.push(
      `Migration kritik hata: ${err instanceof Error ? err.message : "bilinmeyen"}`
    );
    try {
      const partial = migrateRecordToV3(
        {
          schemaVersion: 2,
          customerTags: DEFAULT_CUSTOMER_TAGS,
        },
        warnings
      );
      return { db: partial, warnings };
    } catch {
      return { db: emptyLocalDb(), warnings };
    }
  }
}

/** Tauri SQLite — idempotent ALTER / CREATE ifadesi listesi */
export const SQLITE_V3_MIGRATIONS: string[] = [
  `ALTER TABLE organization_settings ADD COLUMN global_id TEXT`,
  `ALTER TABLE organization_settings ADD COLUMN organization_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE organization_settings ADD COLUMN phone TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE organization_settings ADD COLUMN address TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE organization_settings ADD COLUMN logo_data_url TEXT`,
  `ALTER TABLE organization_settings ADD COLUMN logo_hash TEXT`,
  `ALTER TABLE customers ADD COLUMN global_id TEXT`,
  `ALTER TABLE customers ADD COLUMN organization_id TEXT`,
  `ALTER TABLE customers ADD COLUMN branch_id TEXT`,
  `ALTER TABLE orders ADD COLUMN global_id TEXT`,
  `ALTER TABLE orders ADD COLUMN organization_id TEXT`,
  `ALTER TABLE orders ADD COLUMN branch_id TEXT`,
  `ALTER TABLE orders ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'cash'`,
  `ALTER TABLE order_items ADD COLUMN global_id TEXT`,
  `ALTER TABLE order_items ADD COLUMN organization_id TEXT`,
  `ALTER TABLE order_items ADD COLUMN item_number TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE order_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE order_items ADD COLUMN original_price REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE order_items ADD COLUMN sale_price REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE order_items ADD COLUMN item_status TEXT NOT NULL DEFAULT 'received'`,
  `CREATE TABLE IF NOT EXISTS credit_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    global_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    order_id INTEGER,
    reset_id INTEGER,
    entry_type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_after REAL NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
  )`,
  `CREATE TABLE IF NOT EXISTS credit_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    global_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    amount_reset REAL NOT NULL,
    reset_at TEXT NOT NULL,
    undone_at TEXT,
    note TEXT DEFAULT '',
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    global_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_global_id TEXT,
    action TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    actor_email TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    global_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    body TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS order_number_sequence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    last_sequence INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_global_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    client_updated_at TEXT NOT NULL,
    synced_at TEXT
  )`,
  `UPDATE order_items SET original_price = subtotal, sale_price = subtotal WHERE original_price IS NULL OR original_price = 0`,
  `UPDATE order_items SET item_status = 'received' WHERE item_status IS NULL OR item_status = ''`,
  `UPDATE orders SET payment_mode = payment_method WHERE payment_mode IS NULL OR payment_mode = ''`,
];
