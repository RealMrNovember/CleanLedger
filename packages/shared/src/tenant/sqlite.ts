import { normalizeOrganizationId } from "../organization/profile";

/** Firma başına SQLite dosya adı (örn. cleanledger_test_at_deneme_com.db) */
export function buildTenantSqliteFilename(organizationEmail: string): string {
  const normalized = normalizeOrganizationId(organizationEmail);
  const safe = normalized
    .replace(/@/g, "_at_")
    .replace(/[^a-z0-9._-]/g, "_");
  return `cleanledger_${safe}.db`;
}

export function buildTenantSqlitePath(organizationEmail: string): string {
  return `sqlite:${buildTenantSqliteFilename(organizationEmail)}`;
}

export const LEGACY_SHARED_SQLITE_PATH = "sqlite:cleanledger.db";
