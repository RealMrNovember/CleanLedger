import type { OrganizationSettings } from "../schema/index";
import { computeContentFingerprint } from "../crypto/content-fingerprint";

export const ORG_LOGO_SYNC_ENTITY = "organization_logo" as const;

export interface OrganizationLogoAsset {
  organizationId: string;
  logoHash: string;
  logoDataUrl: string;
}

export interface OrganizationSyncSlice {
  profile: OrganizationSettings;
  logoAsset?: OrganizationLogoAsset;
}

/** Logo base64'ünden dedup hash üretir. */
export function computeLogoHash(logoDataUrl: string | null | undefined): string | null {
  if (!logoDataUrl?.trim()) return null;
  return computeContentFingerprint(logoDataUrl.trim());
}

/** organization_settings kaydına logoHash ekler/günceller. */
export function withLogoHash(
  org: OrganizationSettings,
  logoDataUrl?: string | null
): OrganizationSettings {
  const data = logoDataUrl ?? org.logoDataUrl;
  return {
    ...org,
    logoDataUrl: data ?? null,
    logoHash: computeLogoHash(data),
  };
}

/**
 * Incremental sync için org profilini böler.
 * logoHash değişmediyse logoDataUrl sync payload'ına girmez.
 */
export function prepareOrganizationSyncSlice(
  org: OrganizationSettings,
  previousLogoHash?: string | null
): OrganizationSyncSlice {
  const profile: OrganizationSettings = { ...org };
  const nextHash = org.logoHash ?? computeLogoHash(org.logoDataUrl);
  profile.logoHash = nextHash;

  const hashChanged = nextHash && !fingerprintsEqual(previousLogoHash, nextHash);

  if (!hashChanged) {
    profile.logoDataUrl = null;
    return { profile };
  }

  if (!org.logoDataUrl || !nextHash || !org.organizationId) {
    profile.logoDataUrl = null;
    return { profile };
  }

  profile.logoDataUrl = null;
  return {
    profile,
    logoAsset: {
      organizationId: org.organizationId,
      logoHash: nextHash,
      logoDataUrl: org.logoDataUrl,
    },
  };
}

function fingerprintsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();
  if (!left && !right) return true;
  return left === right && left.length > 0;
}

/** Tam snapshot export'ta logo ayrı kanal olarak çıkarılabilir. */
export function stripLogoFromOrganizationProfile(
  org: OrganizationSettings | null
): OrganizationSettings | null {
  if (!org) return null;
  return {
    ...org,
    logoDataUrl: null,
  };
}
