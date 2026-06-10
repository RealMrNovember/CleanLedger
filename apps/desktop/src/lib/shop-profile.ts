import type { ShopContactInfo } from "@/lib/print-service";

const STORAGE_KEY = "cleanledger_shop_profile_v1";

export interface ShopProfile {
  companyName: string;
  phone: string;
  email: string;
}

function getSessionUser(): { companyName: string; phone: string; email: string } | null {
  for (const key of ["cleanledger_session", "cleanledger_desktop_session"]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const user = (JSON.parse(raw) as { user?: { companyName: string; phone: string; email: string } }).user;
      if (user) return user;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function getShopProfile(): ShopProfile {
  const auth = getSessionUser();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ShopProfile>;
      return {
        companyName:
          parsed.companyName?.trim() ||
          auth?.companyName?.trim() ||
          "CleanLedger",
        phone: parsed.phone?.trim() || auth?.phone?.trim() || "",
        email: parsed.email?.trim() || auth?.email?.trim() || "",
      };
    }
  } catch {
    /* ignore */
  }

  if (auth) {
    return {
      companyName: auth.companyName.trim() || "CleanLedger",
      phone: auth.phone?.trim() || "",
      email: auth.email?.trim() || "",
    };
  }

  return {
    companyName: "CleanLedger",
    phone: "",
    email: "",
  };
}

export function saveShopProfile(profile: ShopProfile): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      companyName: profile.companyName.trim(),
      phone: profile.phone.trim(),
      email: profile.email.trim(),
    })
  );
}

export function shopProfileToContact(profile: ShopProfile): ShopContactInfo {
  return {
    companyName: profile.companyName || "CleanLedger",
    phone: profile.phone || undefined,
    email: profile.email || undefined,
  };
}
