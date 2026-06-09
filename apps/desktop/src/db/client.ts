import type { Product, Order, OrderItem, ServiceType } from "./schema";
import { SEED_PRODUCTS } from "./seed";
import { SERVICE_PRICE_MODIFIERS } from "./schema";

const STORAGE_KEY = "cleanledger_db_v1";

interface LocalDb {
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  nextProductId: number;
  nextOrderId: number;
  nextOrderItemId: number;
  nextOrderNumber: number;
}

function emptyDb(): LocalDb {
  return {
    products: [],
    orders: [],
    orderItems: [],
    nextProductId: 1,
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
  ) => Promise<{ lastInsertId: number }>;
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
      return { lastInsertId: result.lastInsertId ?? 0 };
    },
    select: (query, bindValues) => db.select(query, bindValues),
  };
  return sqlDb;
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
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_phone TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'received',
      created_at TEXT NOT NULL
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
}

async function seedProductsIfEmpty(): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    const existing = await db.select<{ count: number }>(
      "SELECT COUNT(*) as count FROM products"
    );
    if (existing[0]?.count > 0) return;
    for (const p of SEED_PRODUCTS) {
      await db.execute(
        "INSERT INTO products (name, icon_name, base_price) VALUES (?, ?, ?)",
        [p.name, p.iconName, p.basePrice]
      );
    }
    return;
  }

  const local = loadLocalDb();
  if (local.products.length > 0) return;
  for (const p of SEED_PRODUCTS) {
    local.products.push({
      id: local.nextProductId++,
      ...p,
    });
  }
  saveLocalDb(local);
}

export async function initDatabase(): Promise<void> {
  if (isTauri()) {
    await runMigrations();
  }
  await seedProductsIfEmpty();
}

export async function getProducts(): Promise<Product[]> {
  if (isTauri()) {
    const db = await getSqlDb();
    return db.select<Product>("SELECT * FROM products ORDER BY id");
  }
  return loadLocalDb().products;
}

export function calculateServicePrice(
  basePrice: number,
  serviceType: ServiceType
): number {
  const mod = SERVICE_PRICE_MODIFIERS[serviceType];
  if (mod.type === "fixed") return mod.value;
  return Math.round(basePrice * (mod.value / 100));
}

function generateOrderNumber(seq: number): string {
  const year = new Date().getFullYear();
  return `CL-${year}-${String(seq).padStart(5, "0")}`;
}

export interface CreateOrderInput {
  customerPhone: string;
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

  if (isTauri()) {
    const db = await getSqlDb();
    const countRow = await db.select<{ count: number }>(
      "SELECT COUNT(*) as count FROM orders"
    );
    const orderNumber = generateOrderNumber((countRow[0]?.count ?? 0) + 1);

    const result = await db.execute(
      `INSERT INTO orders (order_number, customer_phone, total_amount, status, created_at)
       VALUES (?, ?, ?, 'received', ?)`,
      [orderNumber, input.customerPhone, totalAmount, createdAt]
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

    const order: Order = {
      id: orderId,
      orderNumber,
      customerPhone: input.customerPhone,
      totalAmount,
      status: "received",
      createdAt,
    };
    return { order, items };
  }

  const local = loadLocalDb();
  const orderNumber = generateOrderNumber(local.nextOrderNumber++);
  const orderId = local.nextOrderId++;

  const order: Order = {
    id: orderId,
    orderNumber,
    customerPhone: input.customerPhone,
    totalAmount,
    status: "received",
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
