import type { ShopProfile } from "@cleanledger/shared/organization";
import {
  organizationToShopProfile,
  shopProfileToContact,
  shopProfileToOrganizationInput,
} from "@cleanledger/shared/organization";
import { SHOP_PROFILE_STORAGE_KEY } from "@cleanledger/shared/migrations";
import {
  saveOrganizationSettings,
  getOrganizationSettings,
  getOrganizationSettingsSync,
} from "@/db/client";

export type { ShopProfile };
export { shopProfileToContact };

function readLegacyShopCache(): Partial<ShopProfile> | undefined {
  try {
    const raw = localStorage.getItem(SHOP_PROFILE_STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as Partial<ShopProfile>;
  } catch {
    return undefined;
  }
}

export function getShopProfile(): ShopProfile {
  const org = getOrganizationSettingsSync();
  if (org) return organizationToShopProfile(org);
  return organizationToShopProfile(null, readLegacyShopCache());
}

/** Firma profilini kalıcı depoya yazar (local DB + Tauri SQLite). */
export async function saveShopProfile(profile: ShopProfile): Promise<void> {
  try {
    localStorage.setItem(SHOP_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* quota */
  }
  const existing = await getOrganizationSettings();
  if (existing?.authToken) {
    await saveOrganizationSettings(
      shopProfileToOrganizationInput(
        profile,
        existing.authToken,
        existing.trialEndsAt || undefined
      )
    );
  }
}
