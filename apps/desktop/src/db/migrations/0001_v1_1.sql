-- CleanLedger v1.1 schema extensions (Faz 3)

ALTER TABLE organization_settings ADD COLUMN global_id TEXT;
ALTER TABLE organization_settings ADD COLUMN organization_id TEXT NOT NULL DEFAULT '';
ALTER TABLE organization_settings ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE organization_settings ADD COLUMN address TEXT NOT NULL DEFAULT '';
ALTER TABLE organization_settings ADD COLUMN logo_data_url TEXT;
ALTER TABLE organization_settings ADD COLUMN logo_hash TEXT;

ALTER TABLE customers ADD COLUMN global_id TEXT;
ALTER TABLE customers ADD COLUMN organization_id TEXT;
ALTER TABLE customers ADD COLUMN branch_id TEXT;

ALTER TABLE orders ADD COLUMN global_id TEXT;
ALTER TABLE orders ADD COLUMN organization_id TEXT;
ALTER TABLE orders ADD COLUMN branch_id TEXT;
ALTER TABLE orders ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'cash';

ALTER TABLE order_items ADD COLUMN global_id TEXT;
ALTER TABLE order_items ADD COLUMN organization_id TEXT;
ALTER TABLE order_items ADD COLUMN item_number TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE order_items ADD COLUMN original_price REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN sale_price REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN item_status TEXT NOT NULL DEFAULT 'received';

ALTER TABLE products ADD COLUMN global_id TEXT;
ALTER TABLE products ADD COLUMN organization_id TEXT;
ALTER TABLE customer_tags ADD COLUMN global_id TEXT;
ALTER TABLE customer_tags ADD COLUMN organization_id TEXT;
ALTER TABLE coupons ADD COLUMN global_id TEXT;
ALTER TABLE coupons ADD COLUMN organization_id TEXT;
ALTER TABLE service_prices ADD COLUMN global_id TEXT;
ALTER TABLE service_prices ADD COLUMN organization_id TEXT;
ALTER TABLE order_payments ADD COLUMN global_id TEXT;
ALTER TABLE order_payments ADD COLUMN organization_id TEXT;

CREATE TABLE IF NOT EXISTS credit_ledger (
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
);

CREATE TABLE IF NOT EXISTS credit_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  global_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  amount_reset REAL NOT NULL,
  reset_at TEXT NOT NULL,
  undone_at TEXT,
  note TEXT DEFAULT '',
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  global_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_global_id TEXT,
  action TEXT NOT NULL,
  payload TEXT DEFAULT '{}',
  actor_email TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  global_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_number_sequence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_global_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  client_updated_at TEXT NOT NULL,
  synced_at TEXT
);

UPDATE order_items SET original_price = subtotal, sale_price = subtotal WHERE original_price IS NULL OR original_price = 0;
UPDATE order_items SET item_status = 'received' WHERE item_status IS NULL OR item_status = '';
UPDATE orders SET payment_mode = payment_method WHERE payment_mode IS NULL OR payment_mode = '';
