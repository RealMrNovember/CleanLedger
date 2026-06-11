import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Çekirdek tablolar ───────────────────────────────────────────────────────

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id"),
  organizationId: text("organization_id"),
  name: text("name").notNull(),
  iconName: text("icon_name").notNull(),
  basePrice: real("base_price").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const customerTags = sqliteTable("customer_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id"),
  organizationId: text("organization_id"),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  color: text("color").notNull().default("slate"),
});

export const coupons = sqliteTable("coupons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id"),
  organizationId: text("organization_id"),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),
  value: real("value").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id"),
  organizationId: text("organization_id"),
  branchId: text("branch_id"),
  name: text("name").notNull(),
  lastName: text("last_name").default(""),
  phone: text("phone").notNull().unique(),
  notes: text("notes").default(""),
  address: text("address").default(""),
  tagId: integer("tag_id").notNull().default(1),
  creditBalance: real("credit_balance").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const servicePrices = sqliteTable("service_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id"),
  organizationId: text("organization_id"),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(),
  price: real("price").notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id"),
  organizationId: text("organization_id"),
  branchId: text("branch_id"),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  customerPhone: text("customer_phone").notNull(),
  subtotalAmount: real("subtotal_amount").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  totalAmount: real("total_amount").notNull().default(0),
  amountPaid: real("amount_paid").notNull().default(0),
  balanceDue: real("balance_due").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paymentMode: text("payment_mode").notNull().default("cash"),
  couponCode: text("coupon_code"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  orderStatus: text("order_status").notNull().default("preparing"),
  deliveryDate: text("delivery_date").notNull(),
  priority: text("priority").notNull().default("normal"),
  createdAt: text("created_at").notNull(),
});

/** Firma kimliği, iletişim ve logo — tüm cihazlarda senkronize edilir */
export const organizationSettings = sqliteTable("organization_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id"),
  organizationId: text("organization_id").notNull().default(""),
  companyName: text("company_name").notNull().default(""),
  adminName: text("admin_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  logoDataUrl: text("logo_data_url"),
  logoHash: text("logo_hash"),
  authToken: text("auth_token").notNull().default(""),
  trialEndsAt: text("trial_ends_at").default(""),
  updatedAt: text("updated_at").notNull(),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id"),
  organizationId: text("organization_id"),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  itemNumber: text("item_number").notNull().default(""),
  serviceType: text("service_type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  originalPrice: real("original_price").notNull().default(0),
  salePrice: real("sale_price").notNull().default(0),
  subtotal: real("subtotal").notNull(),
  itemStatus: text("item_status").notNull().default("received"),
  color: text("color"),
});

export const orderPayments = sqliteTable("order_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id"),
  organizationId: text("organization_id"),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  createdAt: text("created_at").notNull(),
  refunded: integer("refunded").notNull().default(0),
});

// ─── v1.1 yeni tablolar ──────────────────────────────────────────────────────

export const creditLedger = sqliteTable("credit_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id").notNull(),
  organizationId: text("organization_id").notNull(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  orderId: integer("order_id").references(() => orders.id),
  resetId: integer("reset_id"),
  entryType: text("entry_type").notNull(),
  amount: real("amount").notNull(),
  balanceAfter: real("balance_after").notNull().default(0),
  note: text("note").default(""),
  createdAt: text("created_at").notNull(),
});

export const creditResets = sqliteTable("credit_resets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id").notNull(),
  organizationId: text("organization_id").notNull(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  amountReset: real("amount_reset").notNull(),
  resetAt: text("reset_at").notNull(),
  undoneAt: text("undone_at"),
  note: text("note").default(""),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id").notNull(),
  organizationId: text("organization_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityGlobalId: text("entity_global_id"),
  action: text("action").notNull(),
  payload: text("payload").default("{}"),
  actorEmail: text("actor_email"),
  createdAt: text("created_at").notNull(),
});

export const whatsappTemplates = sqliteTable("whatsapp_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  globalId: text("global_id").notNull(),
  organizationId: text("organization_id").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  body: text("body").notNull(),
  active: integer("active").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

export const orderNumberSequence = sqliteTable("order_number_sequence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: text("organization_id").notNull(),
  year: integer("year").notNull(),
  lastSequence: integer("last_sequence").notNull().default(0),
});

export const syncQueue = sqliteTable("sync_queue", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityGlobalId: text("entity_global_id").notNull(),
  operation: text("operation").notNull(),
  payload: text("payload").notNull().default("{}"),
  clientUpdatedAt: text("client_updated_at").notNull(),
  syncedAt: text("synced_at"),
});

// ─── Tipler ──────────────────────────────────────────────────────────────────

export type Product = typeof products.$inferSelect;
export type CustomerTag = typeof customerTags.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type ServicePrice = typeof servicePrices.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderPayment = typeof orderPayments.$inferSelect;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type CreditReset = typeof creditResets.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type OrderNumberSequence = typeof orderNumberSequence.$inferSelect;
export type SyncQueueRow = typeof syncQueue.$inferSelect;

export type PaymentStatus = "paid" | "partial" | "unpaid" | "awaiting_delivery";
export type PaymentMethod = "cash" | "card";
export type PaymentMode = "cash" | "card" | "credit" | "pay_on_delivery";
export type OrderStatus = "preparing" | "ready" | "delivered";
export type OrderPriority = "normal" | "urgent";
export type CouponType = "percent" | "fixed";
export type TagColor = "slate" | "yellow" | "gold" | "red" | "mint" | "trust";
export type ItemStatus =
  | "received"
  | "preparing"
  | "processing"
  | "qc"
  | "ready"
  | "delivered"
  | "cancelled";
export type CreditLedgerType =
  | "order_debit"
  | "payment_credit"
  | "reset"
  | "reset_undo"
  | "adjustment";

/** Tutar ve bakiyeye göre ödeme statüsünü hesaplar (OrderPayment kayıtlarıyla uyumlu). */
export function derivePaymentStatus(
  amountPaid: number,
  totalAmount: number,
  paymentMode?: PaymentMode
): PaymentStatus {
  if (paymentMode === "pay_on_delivery" && amountPaid <= 0) {
    return "awaiting_delivery";
  }
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= totalAmount - 0.001) return "paid";
  return "partial";
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Ödendi",
  partial: "Kısmi Ödeme",
  unpaid: "Cari / Ödenmedi",
  awaiting_delivery: "Teslimatta Ödeme",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Nakit",
  card: "Kart",
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Nakit",
  card: "Kredi Kartı",
  credit: "Cari",
  pay_on_delivery: "Teslimatta Ödeme",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Teslim Edildi",
};

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
  normal: "Normal",
  urgent: "Acil",
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  received: "Teslim Alındı",
  preparing: "Hazırlanıyor",
  processing: "İşlemde",
  qc: "Kalite Kontrol",
  ready: "Hazır",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

export const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  slate: "bg-slate-100 text-slate-700",
  yellow: "bg-yellow-100 text-yellow-800",
  gold: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  mint: "bg-mint-light text-[#0f3d3a]",
  trust: "bg-trust-light text-trust",
};

export const DEFAULT_CUSTOMER_TAGS: Array<{
  slug: string;
  label: string;
  color: TagColor;
}> = [
  { slug: "normal", label: "Normal", color: "slate" },
  { slug: "titiz", label: "Titiz Müşteri", color: "yellow" },
  { slug: "vip", label: "VIP", color: "gold" },
  { slug: "problematic", label: "Sıkıntılı/Borçlu", color: "red" },
];

export type ServiceType = "dry_clean" | "iron" | "wash" | "stain_removal";

export const SERVICE_TYPES: ServiceType[] = [
  "dry_clean",
  "iron",
  "wash",
  "stain_removal",
];

/**
 * @deprecated Use `translateService(locale, type)` from `@cleanledger/shared/i18n`.
 * Kept only for legacy imports — values are not locale-aware.
 */
export const SERVICE_LABELS: Record<ServiceType, string> = {
  dry_clean: "Kuru Temizleme",
  iron: "Sadece Ütü",
  wash: "Yıkama",
  stain_removal: "Leke Çıkarma",
};

export const SERVICE_PRICE_MODIFIERS: Record<
  ServiceType,
  { type: "fixed" | "percent"; value: number }
> = {
  dry_clean: { type: "percent", value: 100 },
  iron: { type: "percent", value: 50 },
  wash: { type: "percent", value: 70 },
  stain_removal: { type: "fixed", value: 30 },
};

export interface OrderItemColorBadge {
  label: string;
  hex: string;
}

export interface OrderWithMeta extends Order {
  itemCount: number;
  customerName?: string;
  itemColors?: OrderItemColorBadge[];
  itemNumbers?: string[];
  /** Hazır veya teslim edilmiş kalem sayısı (iptal hariç) */
  itemReadyCount?: number;
  /** İptal hariç aktif kalem sayısı */
  itemActiveCount?: number;
}

export interface OrderDashboardStats {
  tomorrowDeliveries: number;
  itemsInShop: number;
  pendingCollection: number;
}

export interface CustomerListMeta {
  hasActiveOrders: boolean;
  pendingAmount: number;
  creditDebt: number;
}
