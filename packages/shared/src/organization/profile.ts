import type { OrganizationSettings } from "../schema/index";
import type { ShopContactInfo } from "../print/types";

/** Ayarlar ve fişlerde kullanılan firma profili */
export interface ShopProfile {
  companyName: string;
  phone: string;
  email: string;
  address?: string;
  logoDataUrl?: string;
  adminName?: string;
}

export interface OrganizationInput {
  companyName: string;
  adminName: string;
  email: string;
  phone?: string;
  address?: string;
  logoDataUrl?: string;
  authToken: string;
  trialEndsAt?: string;
  organizationId?: string;
}

export function normalizeOrganizationId(email: string): string {
  return email.trim().toLowerCase();
}

export function organizationToShopProfile(
  org: OrganizationSettings | null | undefined,
  fallback?: Partial<ShopProfile>
): ShopProfile {
  if (!org) {
    return {
      companyName: fallback?.companyName?.trim() || "CleanLedger",
      phone: fallback?.phone?.trim() || "",
      email: fallback?.email?.trim() || "",
      address: fallback?.address?.trim() || "",
      logoDataUrl: fallback?.logoDataUrl,
      adminName: fallback?.adminName?.trim() || "",
    };
  }

  return {
    companyName: org.companyName?.trim() || fallback?.companyName?.trim() || "CleanLedger",
    phone: org.phone?.trim() || fallback?.phone?.trim() || "",
    email: org.email?.trim() || fallback?.email?.trim() || "",
    address: org.address?.trim() || fallback?.address?.trim() || "",
    logoDataUrl: org.logoDataUrl ?? fallback?.logoDataUrl,
    adminName: org.adminName?.trim() || fallback?.adminName?.trim() || "",
  };
}

export function shopProfileToContact(profile: ShopProfile): ShopContactInfo {
  return {
    companyName: profile.companyName || "CleanLedger",
    phone: profile.phone || undefined,
    email: profile.email || undefined,
    address: profile.address || undefined,
    logoDataUrl: profile.logoDataUrl,
  };
}

export function shopProfileToOrganizationInput(
  profile: ShopProfile,
  authToken: string,
  trialEndsAt?: string
): OrganizationInput {
  const email = profile.email.trim();
  return {
    companyName: profile.companyName.trim(),
    adminName: profile.adminName?.trim() || "",
    email,
    phone: profile.phone.trim(),
    address: profile.address?.trim() || "",
    logoDataUrl: profile.logoDataUrl,
    authToken,
    trialEndsAt,
    organizationId: email ? normalizeOrganizationId(email) : "",
  };
}
