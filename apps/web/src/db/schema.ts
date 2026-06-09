import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  iconName: text("icon_name").notNull(),
  basePrice: real("base_price").notNull(),
});

export const customerTags = sqliteTable("customer_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  color: text("color").notNull().default("slate"),
});

export const coupons = sqliteTable("coupons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),
  value: real("value").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
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
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(),
  price: real("price").notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  customerPhone: text("customer_phone").notNull(),
  subtotalAmount: real("subtotal_amount").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  totalAmount: real("total_amount").notNull().default(0),
  amountPaid: real("amount_paid").notNull().default(0),
  balanceDue: real("balance_due").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("cash"),
  couponCode: text("coupon_code"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  orderStatus: text("order_status").notNull().default("preparing"),
  deliveryDate: text("delivery_date").notNull(),
  priority: text("priority").notNull().default("normal"),
  createdAt: text("created_at").notNull(),
});

export const organizationSettings = sqliteTable("organization_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull().default(""),
  adminName: text("admin_name").notNull().default(""),
  email: text("email").notNull().default(""),
  authToken: text("auth_token").notNull().default(""),
  trialEndsAt: text("trial_ends_at").default(""),
  updatedAt: text("updated_at").notNull(),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  serviceType: text("service_type").notNull(),
  subtotal: real("subtotal").notNull(),
});

export type Product = typeof products.$inferSelect;
export type CustomerTag = typeof customerTags.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type ServicePrice = typeof servicePrices.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

export type PaymentStatus = "paid" | "unpaid";
export type PaymentMethod = "cash" | "card";
export type OrderStatus = "preparing" | "ready" | "delivered";
export type OrderPriority = "normal" | "urgent";
export type CouponType = "percent" | "fixed";
export type TagColor = "slate" | "yellow" | "gold" | "red" | "mint" | "trust";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Ödendi",
  unpaid: "Cari / Kısmi",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Nakit",
  card: "Kart",
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

export interface OrderWithMeta extends Order {
  itemCount: number;
  customerName?: string;
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
