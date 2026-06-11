import type { OrganizationSettings } from "@/db/schema";
import type { LegacyShopProfile } from "@cleanledger/shared/migrations";
import {
  ORG_STORAGE_KEY,
  SHOP_PROFILE_STORAGE_KEY,
} from "@cleanledger/shared/migrations";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** v2 öncesi ayrı localStorage org kaydı */
export function readLegacyOrgSettings(): OrganizationSettings | null {
  const row = readJson<Record<string, unknown>>(ORG_STORAGE_KEY);
  if (!row || typeof row !== "object") return null;
  return {
    id: 1,
    globalId: null,
    organizationId: String(row.organizationId ?? ""),
    companyName: String(row.companyName ?? ""),
    adminName: String(row.adminName ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    logoDataUrl: row.logoDataUrl != null ? String(row.logoDataUrl) : null,
    logoHash: null,
    authToken: String(row.authToken ?? ""),
    trialEndsAt: String(row.trialEndsAt ?? ""),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

/** v2 öncesi ayrı shop profile önbelleği */
export function readLegacyShopProfile(): LegacyShopProfile | null {
  return readJson<LegacyShopProfile>(SHOP_PROFILE_STORAGE_KEY);
}
