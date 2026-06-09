import type {
  Product,
  Customer,
  Order,
  OrderItem,
  ServiceType,
  ServicePrice,
  PaymentStatus,
  OrderStatus,
  OrderPriority,
  OrderWithMeta,
  OrderDashboardStats,
  CustomerListMeta,
  OrganizationSettings,
} from "./schema";
import { SERVICE_PRICE_MODIFIERS, SERVICE_TYPES } from "./schema";
import { SEED_PRODUCTS } from "./seed";
import { toDateKey, addDaysToDate } from "@/lib/dates";

const STORAGE_KEY = "cleanledger_db_v3";
const ORG_STORAGE_KEY = "cleanledger_org_v1";

interface LocalDb {
  products: Product[];
  customers: Customer[];
  servicePrices: ServicePrice[];
  orders: Order[];
  orderItems: OrderItem[];
  nextProductId: number;
  nextCustomerId: number;
  nextServicePriceId: number;
  nextOrderId: number;
  nextOrderItemId: number;
  nextOrderNumber: number;
}

function emptyDb(): LocalDb {
  return {
    products: [],
    customers: [],
    servicePrices: [],
    orders: [],
    orderItems: [],
    nextProductId: 1,
    nextCustomerId: 1,
    nextServicePriceId: 1,
    nextOrderId: 1,
    nextOrderItemId: 1,
    nextOrderNumber: 1,
  };
}

function loadLocalDb(): LocalDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    return JSON.parse(raw) as LocalDb;
  } catch {
    return emptyDb();
  }
}

function saveLocalDb(db: LocalDb): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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

async function getSqlDb(): Promise<SqlDb> {
  if (sqlDb) return sqlDb;
  const Database = (await import("@tauri-apps/plugin-sql")).default;
  const db = await Database.load("sqlite:cleanledger.db");
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

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    iconName: String(row.icon_name ?? row.iconName ?? "default"),
    basePrice: num(row.base_price ?? row.basePrice, 0),
  };
}

export function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    notes: String(row.notes ?? ""),
    address: String(row.address ?? ""),
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ""),
  };
}

export function mapServicePrice(row: Record<string, unknown>): ServicePrice {
  return {
    id: num(row.id),
    productId: num(row.product_id ?? row.productId),
    serviceType: String(row.service_type ?? row.serviceType) as ServiceType,
    price: num(row.price),
  };
}

export function mapOrder(row: Record<string, unknown>): Order {
  const legacyStatus = String(row.status ?? "");
  let orderStatus = String(
    row.order_status ?? row.orderStatus ?? legacyStatus ?? "preparing"
  ) as OrderStatus;
  if (orderStatus === ("received" as string)) {
    orderStatus = "preparing";
  }
  if (!["preparing", "ready", "delivered"].includes(orderStatus)) {
    orderStatus =
      legacyStatus === "delivered"
        ? "delivered"
        : legacyStatus === "ready"
          ? "ready"
          : "preparing";
  }

  let paymentStatus = String(
    row.payment_status ?? row.paymentStatus ?? "unpaid"
  ) as PaymentStatus;
  if (paymentStatus !== "paid" && paymentStatus !== "unpaid") {
    paymentStatus = "unpaid";
  }

  const deliveryRaw = row.delivery_date ?? row.deliveryDate;
  const deliveryDate = deliveryRaw
    ? String(deliveryRaw).slice(0, 10)
    : toDateKey(addDaysToDate(new Date(), 3));

  let priority = String(row.priority ?? "normal") as OrderPriority;
  if (priority !== "normal" && priority !== "urgent") {
    priority = "normal";
  }

  return {
    id: num(row.id),
    orderNumber: String(row.order_number ?? row.orderNumber ?? ""),
    customerId:
      row.customer_id != null || row.customerId != null
        ? num(row.customer_id ?? row.customerId)
        : null,
    customerPhone: String(row.customer_phone ?? row.customerPhone ?? ""),
    totalAmount: num(row.total_amount ?? row.totalAmount),
    paymentStatus,
    orderStatus,
    deliveryDate,
    priority,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

export function mapOrderItem(row: Record<string, unknown>): OrderItem {
  return {
    id: num(row.id),
    orderId: num(row.order_id ?? row.orderId),
    productId: num(row.product_id ?? row.productId),
    serviceType: String(row.service_type ?? row.serviceType) as ServiceType,
    subtotal: num(row.subtotal),
  };
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
      base_price REAL NOT NULL
    )
  `);
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
        "INSERT INTO products (name, icon_name, base_price) VALUES (?, ?, ?)",
        [p.name, p.iconName, p.basePrice]
      );
      await seedServicePricesForProduct(result.lastInsertId, p.basePrice);
    }
    return;
  }

  const local = loadLocalDb();
  if (local.products.length === 0) {
    for (const p of SEED_PRODUCTS) {
      const id = local.nextProductId++;
      local.products.push({ id, ...p });
      for (const st of SERVICE_TYPES) {
        local.servicePrices.push({
          id: local.nextServicePriceId++,
          productId: id,
          serviceType: st,
          price: defaultPriceForService(p.basePrice, st),
        });
      }
    }
    saveLocalDb(local);
  }
}

export async function initDatabase(): Promise<void> {
  if (isTauri()) await runMigrations();
  await seedAll();
}

export async function getProducts(): Promise<Product[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM products ORDER BY id"
    );
    return rows.map(mapProduct);
  }
  return loadLocalDb().products;
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
    return;
  }
  const local = loadLocalDb();
  const idx = local.servicePrices.findIndex(
    (s) => s.productId === productId && s.serviceType === serviceType
  );
  if (idx >= 0) local.servicePrices[idx].price = price;
  else
    local.servicePrices.push({
      id: local.nextServicePriceId++,
      productId,
      serviceType,
      price,
    });
  saveLocalDb(local);
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
    return;
  }
  const local = loadLocalDb();
  const p = local.products.find((x) => x.id === productId);
  if (p) p.basePrice = basePrice;
  saveLocalDb(local);
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
  phone: string;
  notes?: string;
  address?: string;
}

export async function getCustomers(): Promise<Customer[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM customers ORDER BY name"
    );
    return rows.map(mapCustomer);
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
    return rows[0] ? mapCustomer(rows[0]) : null;
  }
  return (
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
    return rows[0] ? mapCustomer(rows[0]) : null;
  }
  return loadLocalDb().customers.find((c) => c.id === id) ?? null;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const now = new Date().toISOString();
  const data = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    notes: input.notes?.trim() ?? "",
    address: input.address?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      `INSERT INTO customers (name, phone, notes, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.name, data.phone, data.notes, data.address, data.createdAt, data.updatedAt]
    );
    return { id: result.lastInsertId, ...data };
  }

  const local = loadLocalDb();
  const customer: Customer = { id: local.nextCustomerId++, ...data };
  local.customers.push(customer);
  saveLocalDb(local);
  return customer;
}

export async function updateCustomer(
  id: number,
  input: CustomerInput
): Promise<Customer> {
  const now = new Date().toISOString();
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute(
      `UPDATE customers SET name = ?, phone = ?, notes = ?, address = ?, updated_at = ? WHERE id = ?`,
      [
        input.name.trim(),
        input.phone.trim(),
        input.notes?.trim() ?? "",
        input.address?.trim() ?? "",
        now,
        id,
      ]
    );
    return (await getCustomerById(id))!;
  }

  const local = loadLocalDb();
  const c = local.customers.find((x) => x.id === id)!;
  c.name = input.name.trim();
  c.phone = input.phone.trim();
  c.notes = input.notes?.trim() ?? "";
  c.address = input.address?.trim() ?? "";
  c.updatedAt = now;
  saveLocalDb(local);
  return c;
}

export async function deleteCustomer(id: number): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM customers WHERE id = ?", [id]);
    return;
  }
  const local = loadLocalDb();
  local.customers = local.customers.filter((c) => c.id !== id);
  saveLocalDb(local);
}

export interface CustomerOrderSummary {
  orders: Order[];
  totalSpent: number;
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

// ─── Orders ──────────────────────────────────────────────────────────────────

function generateOrderNumber(seq: number): string {
  const year = new Date().getFullYear();
  return `CL-${year}-${String(seq).padStart(5, "0")}`;
}

export interface CreateOrderInput {
  customerPhone: string;
  customerId?: number | null;
  paymentStatus: PaymentStatus;
  orderStatus?: OrderStatus;
  deliveryDate: string;
  priority?: OrderPriority;
  items: Array<{
    productId: number;
    serviceType: ServiceType;
    subtotal: number;
  }>;
}

export async function createOrder(
  input: CreateOrderInput
): Promise<{ order: Order; items: OrderItem[] }> {
  const totalAmount = input.items.reduce((sum, i) => sum + i.subtotal, 0);
  const createdAt = new Date().toISOString();
  const orderStatus = input.orderStatus ?? "preparing";
  const priority = input.priority ?? "normal";
  let customerId = input.customerId ?? null;

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
      `INSERT INTO orders (order_number, customer_id, customer_phone, total_amount, payment_status, order_status, delivery_date, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        customerId,
        input.customerPhone,
        totalAmount,
        input.paymentStatus,
        orderStatus,
        input.deliveryDate,
        priority,
        createdAt,
      ]
    );
    const orderId = result.lastInsertId;

    const items: OrderItem[] = [];
    for (const item of input.items) {
      const itemResult = await db.execute(
        `INSERT INTO order_items (order_id, product_id, service_type, subtotal)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.productId, item.serviceType, item.subtotal]
      );
      items.push({
        id: itemResult.lastInsertId,
        orderId,
        productId: item.productId,
        serviceType: item.serviceType,
        subtotal: item.subtotal,
      });
    }

    return {
      order: {
        id: orderId,
        orderNumber,
        customerId,
        customerPhone: input.customerPhone,
        totalAmount,
        paymentStatus: input.paymentStatus,
        orderStatus,
        deliveryDate: input.deliveryDate,
        priority,
        createdAt,
      },
      items,
    };
  }

  const local = loadLocalDb();
  const orderNumber = generateOrderNumber(local.nextOrderNumber++);
  const orderId = local.nextOrderId++;

  const order: Order = {
    id: orderId,
    orderNumber,
    customerId,
    customerPhone: input.customerPhone,
    totalAmount,
    paymentStatus: input.paymentStatus,
    orderStatus,
    deliveryDate: input.deliveryDate,
    priority,
    createdAt,
  };
  local.orders.push(order);

  const items: OrderItem[] = input.items.map((item) => {
    const row: OrderItem = {
      id: local.nextOrderItemId++,
      orderId,
      productId: item.productId,
      serviceType: item.serviceType,
      subtotal: item.subtotal,
    };
    local.orderItems.push(row);
    return row;
  });

  saveLocalDb(local);
  return { order, items };
}

export async function upsertCustomerByPhone(
  phone: string,
  name?: string
): Promise<Customer | null> {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const existing = await getCustomerByPhone(trimmed);
  if (existing) return existing;
  if (name?.trim()) {
    return createCustomer({ name: name.trim(), phone: trimmed });
  }
  return null;
}

// ─── Order tracking & stats ───────────────────────────────────────────────────

async function enrichOrders(orders: Order[]): Promise<OrderWithMeta[]> {
  const customers = await getCustomers();
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  if (isTauri()) {
    const db = await getSqlDb();
    return Promise.all(
      orders.map(async (o) => {
        const countRow = await db.select<{ count: number }>(
          "SELECT COUNT(*) as count FROM order_items WHERE order_id = ?",
          [o.id]
        );
        return {
          ...o,
          itemCount: countRow[0]?.count ?? 0,
          customerName: o.customerId
            ? customerMap.get(o.customerId)
            : customers.find((c) => c.phone === o.customerPhone)?.name,
        };
      })
    );
  }

  const local = loadLocalDb();
  return orders.map((o) => ({
    ...o,
    itemCount: local.orderItems.filter((i) => i.orderId === o.id).length,
    customerName: o.customerId
      ? customerMap.get(o.customerId)
      : customers.find((c) => c.phone === o.customerPhone)?.name,
  }));
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
      .filter((o) => o.paymentStatus === "unpaid")
      .reduce((s, o) => s + o.totalAmount, 0),
  };
}

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
    return;
  }
  const local = loadLocalDb();
  const o = local.orders.find((x) => x.id === orderId);
  if (o) (o as Order).paymentStatus = paymentStatus;
  saveLocalDb(local);
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
    return;
  }
  const local = loadLocalDb();
  const o = local.orders.find((x) => x.id === orderId);
  if (o) (o as Order).orderStatus = orderStatus;
  saveLocalDb(local);
}

export async function getCustomerListMeta(
  customerId: number,
  phone: string
): Promise<CustomerListMeta> {
  if (isTauri()) {
    const db = await getSqlDb();
    const active = await db.select<{ count: number }>(
      `SELECT COUNT(*) as count FROM orders
       WHERE (customer_id = ? OR customer_phone = ?) AND order_status != 'delivered'`,
      [customerId, phone]
    );
    const pending = await db.select<{ total: number }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
       WHERE (customer_id = ? OR customer_phone = ?) AND payment_status = 'unpaid' AND order_status != 'delivered'`,
      [customerId, phone]
    );
    return {
      hasActiveOrders: (active[0]?.count ?? 0) > 0,
      pendingAmount: pending[0]?.total ?? 0,
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
      .filter((o) => o.paymentStatus === "unpaid")
      .reduce((s, o) => s + o.totalAmount, 0),
  };
}

// ─── Organization / Auth sync ────────────────────────────────────────────────

export interface OrganizationInput {
  companyName: string;
  adminName: string;
  email: string;
  authToken: string;
  trialEndsAt?: string;
}

export async function saveOrganizationSettings(
  input: OrganizationInput
): Promise<OrganizationSettings> {
  const updatedAt = new Date().toISOString();
  const row = {
    companyName: input.companyName.trim(),
    adminName: input.adminName.trim(),
    email: input.email.trim(),
    authToken: input.authToken,
    trialEndsAt: input.trialEndsAt ?? "",
    updatedAt,
  };

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM organization_settings");
    const result = await db.execute(
      `INSERT INTO organization_settings (company_name, admin_name, email, auth_token, trial_ends_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        row.companyName,
        row.adminName,
        row.email,
        row.authToken,
        row.trialEndsAt,
        row.updatedAt,
      ]
    );
    return { id: result.lastInsertId, ...row };
  }

  const settings: OrganizationSettings = { id: 1, ...row };
  localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

export async function getOrganizationSettings(): Promise<OrganizationSettings | null> {
  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<Record<string, unknown>>(
      "SELECT * FROM organization_settings ORDER BY id DESC LIMIT 1"
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: num(r.id),
      companyName: String(r.company_name ?? r.companyName ?? ""),
      adminName: String(r.admin_name ?? r.adminName ?? ""),
      email: String(r.email ?? ""),
      authToken: String(r.auth_token ?? r.authToken ?? ""),
      trialEndsAt: String(r.trial_ends_at ?? r.trialEndsAt ?? ""),
      updatedAt: String(r.updated_at ?? r.updatedAt ?? ""),
    };
  }

  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrganizationSettings;
  } catch {
    return null;
  }
}

export async function clearOrganizationSettings(): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM organization_settings");
  }
  localStorage.removeItem(ORG_STORAGE_KEY);
}
