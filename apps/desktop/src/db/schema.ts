import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  iconName: text("icon_name").notNull(),
  basePrice: real("base_price").notNull(),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  notes: text("notes").default(""),
  address: text("address").default(""),
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
  totalAmount: real("total_amount").notNull().default(0),
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
export type Customer = typeof customers.$inferSelect;
export type ServicePrice = typeof servicePrices.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

export type PaymentStatus = "paid" | "unpaid";
export type OrderStatus = "preparing" | "ready" | "delivered";
export type OrderPriority = "normal" | "urgent";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Ödendi",
  unpaid: "Ödenecek",
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
}
