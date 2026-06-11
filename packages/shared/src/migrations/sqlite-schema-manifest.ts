/**
 * Tauri SQLite tenant DB — beklenen tablo/kolon manifesti.
 * Yeni kolon eklendiğinde yalnızca burayı + SQLITE_V3/V4 migration listesini güncelleyin.
 */
export const SQLITE_REQUIRED_TABLES = [
  "products",
  "customers",
  "customer_tags",
  "coupons",
  "service_prices",
  "orders",
  "order_items",
  "order_payments",
  "organization_settings",
  "credit_ledger",
  "credit_resets",
  "audit_log",
  "whatsapp_templates",
  "order_number_sequence",
  "sync_queue",
  "product_color_palette",
] as const;

export type SqliteRequiredTable = (typeof SQLITE_REQUIRED_TABLES)[number];

/** v1.1+ zorunlu kolonlar (tablo mevcutsa kontrol edilir). */
export const SQLITE_REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  organization_settings: [
    "global_id",
    "organization_id",
    "phone",
    "address",
    "logo_data_url",
    "logo_hash",
  ],
  products: ["global_id", "organization_id"],
  customer_tags: ["global_id", "organization_id"],
  coupons: ["global_id", "organization_id"],
  service_prices: ["global_id", "organization_id"],
  orders: ["global_id", "organization_id", "branch_id", "payment_mode"],
  order_items: [
    "global_id",
    "organization_id",
    "item_number",
    "quantity",
    "original_price",
    "sale_price",
    "item_status",
    "color",
  ],
  order_payments: ["global_id", "organization_id"],
  customers: ["global_id", "organization_id", "branch_id"],
};

export interface SqliteSchemaReport {
  missingTables: string[];
  missingColumns: string[];
  compliant: boolean;
}

/** PRAGMA table_info satırlarından şema uyum raporu üretir. */
export function buildSqliteSchemaReport(
  tableExists: (table: string) => boolean,
  columnExists: (table: string, column: string) => boolean
): SqliteSchemaReport {
  const missingTables: string[] = [];
  const missingColumns: string[] = [];

  for (const table of SQLITE_REQUIRED_TABLES) {
    if (!tableExists(table)) {
      missingTables.push(table);
      continue;
    }
    const cols = SQLITE_REQUIRED_COLUMNS[table];
    if (!cols) continue;
    for (const column of cols) {
      if (!columnExists(table, column)) {
        missingColumns.push(`${table}.${column}`);
      }
    }
  }

  return {
    missingTables,
    missingColumns,
    compliant: missingTables.length === 0 && missingColumns.length === 0,
  };
}
