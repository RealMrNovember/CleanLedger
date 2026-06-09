import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  iconName: text("icon_name").notNull(),
  basePrice: real("base_price").notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerPhone: text("customer_phone").notNull(),
  totalAmount: real("total_amount").notNull().default(0),
  status: text("status").notNull().default("received"),
  createdAt: text("created_at").notNull(),
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
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

export type ServiceType = "dry_clean" | "iron" | "wash" | "stain_removal";

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
