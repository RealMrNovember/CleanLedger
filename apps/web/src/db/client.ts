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
  OrderStatus,
  OrderPriority,
  CouponType,
  TagColor,
  OrderWithMeta,
  OrderDashboardStats,
  CustomerListMeta,
  OrganizationSettings,
} from "./schema";
import {
  SERVICE_PRICE_MODIFIERS,
  SERVICE_TYPES,
  DEFAULT_CUSTOMER_TAGS,
} from "./schema";
import { SEED_PRODUCTS } from "./seed";
import { toDateKey, addDaysToDate } from "@/lib/dates";
import { formatCustomerName } from "@/lib/utils";

const STORAGE_KEY = "cleanledger_web_db_v2";
const LEGACY_STORAGE_KEY = "cleanledger_web_db_v1";
const ORG_STORAGE_KEY = "cleanledger_web_org_v1";

export interface LocalDb {
  products: Product[];
  customers: Customer[];
  customerTags: CustomerTag[];
  coupons: Coupon[];
  servicePrices: ServicePrice[];
  orders: Order[];
  orderItems: OrderItem[];
  orderPayments: OrderPayment[];
  nextProductId: number;
  nextCustomerId: number;
  nextCustomerTagId: number;
  nextCouponId: number;
  nextServicePriceId: number;
  nextOrderId: number;
  nextOrderItemId: number;
  nextOrderPaymentId: number;
  nextOrderNumber: number;
}

function seedDefaultTags(startId = 1): CustomerTag[] {
  return DEFAULT_CUSTOMER_TAGS.map((t, i) => ({
    id: startId + i,
    slug: t.slug,
    label: t.label,
    color: t.color,
  }));
}

function emptyDb(): LocalDb {
  const tags = seedDefaultTags();
  return {
    products: [],
    customers: [],
    customerTags: tags,
    coupons: [],
    servicePrices: [],
    orders: [],
    orderItems: [],
    orderPayments: [],
    nextProductId: 1,
    nextCustomerId: 1,
    nextCustomerTagId: tags.length + 1,
    nextCouponId: 1,
    nextServicePriceId: 1,
    nextOrderId: 1,
    nextOrderItemId: 1,
    nextOrderPaymentId: 1,
    nextOrderNumber: 1,
  };
}

function migrateLegacyDb(parsed: Record<string, unknown>): LocalDb {
  const base = emptyDb();
  const merged: LocalDb = {
    ...base,
    ...(parsed as Partial<LocalDb>),
    customerTags:
      Array.isArray(parsed.customerTags) && parsed.customerTags.length
        ? (parsed.customerTags as CustomerTag[])
        : base.customerTags,
    coupons: Array.isArray(parsed.coupons) ? (parsed.coupons as Coupon[]) : [],
    customers: (Array.isArray(parsed.customers) ? parsed.customers : []).map(
      (c) => mapCustomer(c as Record<string, unknown>)
    ),
    orders: (Array.isArray(parsed.orders) ? parsed.orders : []).map((o) =>
      mapOrder(o as Record<string, unknown>)
    ),
    orderPayments: Array.isArray(parsed.orderPayments)
      ? (parsed.orderPayments as OrderPayment[])
      : [],
    nextOrderPaymentId: num(parsed.nextOrderPaymentId, 1),
    nextCustomerTagId: num(parsed.nextCustomerTagId, base.nextCustomerTagId),
    nextCouponId: num(parsed.nextCouponId, 1),
  };
  return merged;
}

function loadLocalDb(): LocalDb {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const migrated = migrateLegacyDb(JSON.parse(legacy) as Record<string, unknown>);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return migrated;
      }
      return emptyDb();
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!Array.isArray(parsed.customerTags)) {
      return migrateLegacyDb(parsed);
    }
    const db = parsed as unknown as LocalDb;
    if (!Array.isArray(db.orderPayments)) db.orderPayments = [];
    if (!db.nextOrderPaymentId) db.nextOrderPaymentId = 1;
    backfillOrderPayments(db);
    return db;
  } catch {
    return emptyDb();
  }
}

function saveLocalDb(db: LocalDb): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  triggerSyncPush();
}

function triggerSyncPush(): void {
  void import("@/lib/sync-service").then((m) => m.scheduleSyncPush());
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

export function mapCustomerTag(row: Record<string, unknown>): CustomerTag {
  return {
    id: num(row.id),
    slug: String(row.slug ?? ""),
    label: String(row.label ?? ""),
    color: String(row.color ?? "slate") as TagColor,
  };
}

export function mapCoupon(row: Record<string, unknown>): Coupon {
  return {
    id: num(row.id),
    code: String(row.code ?? "").toUpperCase(),
    type: String(row.type ?? "percent") as CouponType,
    value: num(row.value),
    active: num(row.active, 1),
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
  };
}

export function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    lastName: String(row.last_name ?? row.lastName ?? ""),
    phone: String(row.phone ?? ""),
    notes: String(row.notes ?? ""),
    address: String(row.address ?? ""),
    tagId: num(row.tag_id ?? row.tagId, 1),
    creditBalance: num(row.credit_balance ?? row.creditBalance, 0),
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

  const subtotalAmount = num(
    row.subtotal_amount ?? row.subtotalAmount ?? row.total_amount ?? row.totalAmount,
    0
  );
  const discountAmount = num(row.discount_amount ?? row.discountAmount, 0);
  const totalAmount = num(
    row.total_amount ?? row.totalAmount,
    Math.max(0, subtotalAmount - discountAmount)
  );
  const amountPaid = num(row.amount_paid ?? row.amountPaid, 0);
  const balanceDue = num(
    row.balance_due ?? row.balanceDue,
    Math.max(0, totalAmount - amountPaid)
  );
  let paymentMethod = String(
    row.payment_method ?? row.paymentMethod ?? "cash"
  ) as PaymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "card") {
    paymentMethod = "cash";
  }

  return {
    id: num(row.id),
    orderNumber: String(row.order_number ?? row.orderNumber ?? ""),
    customerId:
      row.customer_id != null || row.customerId != null
        ? num(row.customer_id ?? row.customerId)
        : null,
    customerPhone: String(row.customer_phone ?? row.customerPhone ?? ""),
    subtotalAmount,
    discountAmount,
    totalAmount,
    amountPaid,
    balanceDue,
    paymentMethod,
    couponCode:
      row.coupon_code != null || row.couponCode != null
        ? String(row.coupon_code ?? row.couponCode)
        : null,
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

export function mapOrderPayment(row: Record<string, unknown>): OrderPayment {
  let paymentMethod = String(
    row.payment_method ?? row.paymentMethod ?? "cash"
  ) as PaymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "card") {
    paymentMethod = "cash";
  }
  return {
    id: num(row.id),
    orderId: num(row.order_id ?? row.orderId),
    amount: num(row.amount),
    paymentMethod,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    refunded: num(row.refunded, 0),
  };
}

function backfillOrderPayments(db: LocalDb): void {
  for (const order of db.orders) {
    const active = db.orderPayments.filter(
      (p) => p.orderId === order.id && !p.refunded
    );
    const recorded = active.reduce((s, p) => s + p.amount, 0);
    if (order.amountPaid > recorded + 0.001) {
      db.orderPayments.push({
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

async function adjustCustomerCredit(
  customerId: number | null,
  customerPhone: string,
  delta: number
): Promise<void> {
  if (Math.abs(delta) < 0.001) return;
  let cid = customerId;
  if (!cid) {
    const c = await getCustomerByPhone(customerPhone);
    cid = c?.id ?? null;
  }
  if (!cid) return;

  if (isTauri()) {
    const db = await getSqlDb();
    const rows = await db.select<{ credit_balance: number }>(
      "SELECT credit_balance FROM customers WHERE id = ?",
      [cid]
    );
    const next = Math.max(0, (rows[0]?.credit_balance ?? 0) + delta);
    await db.execute("UPDATE customers SET credit_balance = ? WHERE id = ?", [
      next,
      cid,
    ]);
    return;
  }

  const local = loadLocalDb();
  const c = local.customers.find((x) => x.id === cid);
  if (c) {
    c.creditBalance = Math.max(0, c.creditBalance + delta);
    saveLocalDb(local);
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
    triggerSyncPush();
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
  lastName?: string;
  phone: string;
  notes?: string;
  address?: string;
  tagId?: number;
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
  const tagId = input.tagId ?? 1;
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
      `INSERT INTO customers (name, last_name, phone, notes, address, tag_id, credit_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
    triggerSyncPush();
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
    triggerSyncPush();
    return (await getCustomerById(id))!;
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
  }>;
}

export async function createOrder(
  input: CreateOrderInput
): Promise<{ order: Order; items: OrderItem[] }> {
  const subtotalAmount = input.items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountAmount = Math.min(
    input.discountAmount ?? 0,
    subtotalAmount
  );
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);
  const amountPaid = Math.min(
    Math.max(0, input.amountPaid),
    totalAmount
  );
  const balanceDue = Math.max(0, totalAmount - amountPaid);
  const paymentStatus: PaymentStatus =
    balanceDue <= 0 ? "paid" : "unpaid";
  const createdAt = new Date().toISOString();
  const orderStatus = input.orderStatus ?? "preparing";
  const priority = input.priority ?? "normal";
  const paymentMethod = input.paymentMethod;
  const couponCode = input.couponCode?.trim().toUpperCase() || null;
  let customerId = input.customerId ?? null;

  if (!customerId) {
    const existing = await getCustomerByPhone(input.customerPhone);
    if (existing) customerId = existing.id;
  }

  const applyCreditToCustomer = async (cid: number) => {
    if (balanceDue <= 0) return;
    if (isTauri()) {
      const db = await getSqlDb();
      await db.execute(
        "UPDATE customers SET credit_balance = credit_balance + ? WHERE id = ?",
        [balanceDue, cid]
      );
      return;
    }
    const local = loadLocalDb();
    const c = local.customers.find((x) => x.id === cid);
    if (c) {
      c.creditBalance += balanceDue;
      saveLocalDb(local);
    }
  };

  if (isTauri()) {
    const db = await getSqlDb();
    const countRow = await db.select<{ count: number }>(
      "SELECT COUNT(*) as count FROM orders"
    );
    const orderNumber = generateOrderNumber((countRow[0]?.count ?? 0) + 1);

    const result = await db.execute(
      `INSERT INTO orders (order_number, customer_id, customer_phone, subtotal_amount, discount_amount, total_amount, amount_paid, balance_due, payment_method, coupon_code, payment_status, order_status, delivery_date, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        customerId,
        input.customerPhone,
        subtotalAmount,
        discountAmount,
        totalAmount,
        amountPaid,
        balanceDue,
        paymentMethod,
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

    if (customerId) await applyCreditToCustomer(customerId);

    if (amountPaid > 0) {
      await insertOrderPaymentRecord(
        orderId,
        amountPaid,
        paymentMethod,
        createdAt
      );
    }

    triggerSyncPush();
    return {
      order: {
        id: orderId,
        orderNumber,
        customerId,
        customerPhone: input.customerPhone,
        subtotalAmount,
        discountAmount,
        totalAmount,
        amountPaid,
        balanceDue,
        paymentMethod,
        couponCode,
        paymentStatus,
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
    subtotalAmount,
    discountAmount,
    totalAmount,
    amountPaid,
    balanceDue,
    paymentMethod,
    couponCode,
    paymentStatus,
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

  if (customerId) {
    const c = local.customers.find((x) => x.id === customerId);
    if (c && balanceDue > 0) c.creditBalance += balanceDue;
  }

  if (amountPaid > 0) {
    local.orderPayments.push({
      id: local.nextOrderPaymentId++,
      orderId,
      amount: amountPaid,
      paymentMethod,
      createdAt,
      refunded: 0,
    });
  }

  saveLocalDb(local);
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
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const nameFor = (o: Order) => {
    const c = o.customerId
      ? customerMap.get(o.customerId)
      : customers.find((x) => x.phone === o.customerPhone);
    return c ? formatCustomerName(c) : undefined;
  };

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
          customerName: nameFor(o),
        };
      })
    );
  }

  const local = loadLocalDb();
  return orders.map((o) => ({
    ...o,
    itemCount: local.orderItems.filter((i) => i.orderId === o.id).length,
    customerName: nameFor(o),
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
  if (!order) throw new Error("Sipariş bulunamadı");

  const payAmount = Math.min(Math.max(0, amount), order.balanceDue);
  if (payAmount <= 0) throw new Error("Ödenecek tutar yok");

  const createdAt = new Date().toISOString();
  const payment = await insertOrderPaymentRecord(
    orderId,
    payAmount,
    paymentMethod,
    createdAt
  );

  const amountPaid = order.amountPaid + payAmount;
  const balanceDue = Math.max(0, order.totalAmount - amountPaid);
  const paymentStatus: PaymentStatus = balanceDue <= 0 ? "paid" : "unpaid";

  await syncOrderPaymentTotals(orderId, {
    amountPaid,
    balanceDue,
    paymentStatus,
    paymentMethod,
  });
  await adjustCustomerCredit(order.customerId, order.customerPhone, -payAmount);

  triggerSyncPush();
  return payment;
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
    if (!payment || payment.refunded) throw new Error("Ödeme kaydı bulunamadı");
    await db.execute("UPDATE order_payments SET refunded = 1 WHERE id = ?", [
      paymentId,
    ]);
  } else {
    const local = loadLocalDb();
    payment = local.orderPayments.find((p) => p.id === paymentId) ?? null;
    if (!payment || payment.refunded) throw new Error("Ödeme kaydı bulunamadı");
    payment.refunded = 1;
    saveLocalDb(local);
  }

  const order = await getOrderById(payment.orderId);
  if (!order) return;

  const amountPaid = Math.max(0, order.amountPaid - payment.amount);
  const balanceDue = Math.max(0, order.totalAmount - amountPaid);
  const paymentStatus: PaymentStatus = balanceDue <= 0 ? "paid" : "unpaid";

  await syncOrderPaymentTotals(payment.orderId, {
    amountPaid,
    balanceDue,
    paymentStatus,
  });
  await adjustCustomerCredit(
    order.customerId,
    order.customerPhone,
    payment.amount
  );

  triggerSyncPush();
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
    triggerSyncPush();
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
    triggerSyncPush();
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

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      "INSERT INTO customer_tags (slug, label, color) VALUES (?, ?, ?)",
      [slug, label, color]
    );
    triggerSyncPush();
    return { id: result.lastInsertId, slug, label, color };
  }

  const local = loadLocalDb();
  const tag: CustomerTag = {
    id: local.nextCustomerTagId++,
    slug,
    label,
    color,
  };
  local.customerTags.push(tag);
  saveLocalDb(local);
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
    triggerSyncPush();
    return (await getCustomerTagById(id))!;
  }

  const local = loadLocalDb();
  const tag = local.customerTags.find((t) => t.id === id)!;
  tag.slug = slug;
  tag.label = label;
  tag.color = color;
  saveLocalDb(local);
  return tag;
}

export async function deleteCustomerTag(id: number): Promise<void> {
  if (id <= 4) {
    throw new Error("Varsayılan etiketler silinemez.");
  }

  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("UPDATE customers SET tag_id = 1 WHERE tag_id = ?", [id]);
    await db.execute("DELETE FROM customer_tags WHERE id = ?", [id]);
    triggerSyncPush();
    return;
  }

  const local = loadLocalDb();
  local.customers.forEach((c) => {
    if (c.tagId === id) c.tagId = 1;
  });
  local.customerTags = local.customerTags.filter((t) => t.id !== id);
  saveLocalDb(local);
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

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      "INSERT INTO coupons (code, type, value, active, created_at) VALUES (?, ?, ?, ?, ?)",
      [code, input.type, value, active, createdAt]
    );
    triggerSyncPush();
    return {
      id: result.lastInsertId,
      code,
      type: input.type,
      value,
      active,
      createdAt,
    };
  }

  const local = loadLocalDb();
  const coupon: Coupon = {
    id: local.nextCouponId++,
    code,
    type: input.type,
    value,
    active,
    createdAt,
  };
  local.coupons.push(coupon);
  saveLocalDb(local);
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
    triggerSyncPush();
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
  saveLocalDb(local);
  return coupon;
}

export async function deleteCoupon(id: number): Promise<void> {
  if (isTauri()) {
    const db = await getSqlDb();
    await db.execute("DELETE FROM coupons WHERE id = ?", [id]);
    triggerSyncPush();
    return;
  }
  const local = loadLocalDb();
  local.coupons = local.coupons.filter((c) => c.id !== id);
  saveLocalDb(local);
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

  if (isTauri()) {
    const db = await getSqlDb();
    const result = await db.execute(
      "INSERT INTO products (name, icon_name, base_price) VALUES (?, ?, ?)",
      [name, iconName, basePrice]
    );
    await seedServicePricesForProduct(result.lastInsertId, basePrice);
    triggerSyncPush();
    return {
      id: result.lastInsertId,
      name,
      iconName,
      basePrice,
    };
  }

  const local = loadLocalDb();
  const id = local.nextProductId++;
  const product: Product = { id, name, iconName, basePrice };
  local.products.push(product);
  for (const st of SERVICE_TYPES) {
    local.servicePrices.push({
      id: local.nextServicePriceId++,
      productId: id,
      serviceType: st,
      price: defaultPriceForService(basePrice, st),
    });
  }
  saveLocalDb(local);
  return product;
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

// ─── Cloud sync snapshot ─────────────────────────────────────────────────────

export interface DatabaseSnapshot {
  version: 2;
  updatedAt: string;
  data: LocalDb;
}

async function buildLocalDbFromTauri(): Promise<LocalDb> {
  const db = await getSqlDb();
  const products = (
    await db.select<Record<string, unknown>>("SELECT * FROM products ORDER BY id")
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

  const maxId = (arr: { id: number }[], fallback: number) =>
    arr.length ? Math.max(...arr.map((x) => x.id)) + 1 : fallback;

  return {
    products,
    customers,
    customerTags: customerTags.length ? customerTags : seedDefaultTags(),
    coupons,
    servicePrices,
    orders,
    orderItems,
    orderPayments,
    nextProductId: maxId(products, 1),
    nextCustomerId: maxId(customers, 1),
    nextCustomerTagId: maxId(customerTags, 5),
    nextCouponId: maxId(coupons, 1),
    nextServicePriceId: maxId(servicePrices, 1),
    nextOrderId: maxId(orders, 1),
    nextOrderItemId: maxId(orderItems, 1),
    nextOrderPaymentId: maxId(orderPayments, 1),
    nextOrderNumber: orders.length + 1,
  };
}

async function applyLocalDbToTauri(data: LocalDb): Promise<void> {
  const db = await getSqlDb();
  await db.execute("DELETE FROM order_items");
  await db.execute("DELETE FROM order_payments");
  await db.execute("DELETE FROM orders");
  await db.execute("DELETE FROM service_prices");
  await db.execute("DELETE FROM customers");
  await db.execute("DELETE FROM coupons");
  await db.execute("DELETE FROM customer_tags");
  await db.execute("DELETE FROM products");

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
      "INSERT INTO products (id, name, icon_name, base_price) VALUES (?, ?, ?, ?)",
      [p.id, p.name, p.iconName, p.basePrice]
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
  for (const o of data.orders) {
    await db.execute(
      `INSERT INTO orders (id, order_number, customer_id, customer_phone, subtotal_amount, discount_amount, total_amount, amount_paid, balance_due, payment_method, coupon_code, payment_status, order_status, delivery_date, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o.id,
        o.orderNumber,
        o.customerId,
        o.customerPhone,
        o.subtotalAmount ?? o.totalAmount,
        o.discountAmount ?? 0,
        o.totalAmount,
        o.amountPaid ?? (o.paymentStatus === "paid" ? o.totalAmount : 0),
        o.balanceDue ?? 0,
        o.paymentMethod ?? "cash",
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
      "INSERT INTO order_items (id, order_id, product_id, service_type, subtotal) VALUES (?, ?, ?, ?, ?)",
      [i.id, i.orderId, i.productId, i.serviceType, i.subtotal]
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
}

export async function exportDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  const data = isTauri() ? await buildLocalDbFromTauri() : loadLocalDb();
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    data,
  };
}

export async function importDatabaseSnapshot(
  snapshot: DatabaseSnapshot
): Promise<void> {
  const data = migrateLegacyDb(
    snapshot.data as unknown as Record<string, unknown>
  );
  if (isTauri()) {
    await applyLocalDbToTauri(data);
    triggerSyncPush();
    return;
  }
  saveLocalDb(data);
}
