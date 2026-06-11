import type { LocalDb } from "../schema/local-db";
import { LOCAL_DB_SCHEMA_VERSION } from "../schema/local-db";
import { cloneDefaultProductColorPalette } from "../colors/product-palette";
import {
  emptyLocalDb,
  migrateRecordToV3,
  safeMigrateRecordToV3,
  type MigrationResult,
} from "./v3";

export const SQLITE_V4_MIGRATIONS: string[] = [
  `ALTER TABLE order_items ADD COLUMN color TEXT`,
  `CREATE TABLE IF NOT EXISTS product_color_palette (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    hex TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
];

function backfillProductColorPalette(db: LocalDb): void {
  if (!Array.isArray(db.productColorPalette) || !db.productColorPalette.length) {
    db.productColorPalette = cloneDefaultProductColorPalette();
  }
}

export function migrateRecordToV4(
  parsed: Record<string, unknown>,
  warnings: string[] = []
): LocalDb {
  const db = migrateRecordToV3(parsed, warnings);
  db.schemaVersion = LOCAL_DB_SCHEMA_VERSION;
  backfillProductColorPalette(db);
  db.orderItems = db.orderItems.map((item) => ({
    ...item,
    color: item.color ?? null,
  }));
  return db;
}

export function safeMigrateRecordToV4(parsed: unknown): MigrationResult {
  const warnings: string[] = [];

  if (!parsed || typeof parsed !== "object") {
    warnings.push("Geçersiz kök veri — boş veritabanı oluşturuldu");
    return { db: emptyLocalDb(), warnings };
  }

  try {
    return {
      db: migrateRecordToV4(parsed as Record<string, unknown>, warnings),
      warnings,
    };
  } catch (err) {
    warnings.push(
      `Migration kritik hata: ${err instanceof Error ? err.message : "bilinmeyen"}`
    );
    try {
      return safeMigrateRecordToV3(parsed);
    } catch {
      return { db: emptyLocalDb(), warnings };
    }
  }
}
