import { describe, expect, it } from "vitest";
import type { OrganizationSettings } from "../schema/index";
import {
  computeLogoHash,
  prepareOrganizationSyncSlice,
  withLogoHash,
} from "./organization-asset";

const baseOrg = (): OrganizationSettings => ({
  id: 1,
  globalId: "018f0000-7000-7000-8000-000000000001",
  organizationId: "demo@firma.com",
  companyName: "Demo",
  adminName: "Admin",
  email: "demo@firma.com",
  phone: "",
  address: "",
  logoDataUrl: null,
  logoHash: null,
  authToken: "token",
  trialEndsAt: "",
  updatedAt: new Date().toISOString(),
});

describe("organization logo sync", () => {
  it("withLogoHash logo değişince hash üretir", () => {
    const logo = "data:image/png;base64,AAAA";
    const org = withLogoHash(baseOrg(), logo);
    expect(org.logoDataUrl).toBe(logo);
    expect(org.logoHash).toBe(computeLogoHash(logo));
  });

  it("hash değişmediyse incremental payload logo içermez", () => {
    const logo = "data:image/png;base64,BBBB";
    const org = withLogoHash(baseOrg(), logo);
    const slice = prepareOrganizationSyncSlice(org, org.logoHash);
    expect(slice.profile.logoDataUrl).toBeNull();
    expect(slice.logoAsset).toBeUndefined();
  });

  it("hash değiştiyse logoAsset ayrı kanalda döner", () => {
    const logo = "data:image/png;base64,CCCC";
    const org = withLogoHash(baseOrg(), logo);
    const slice = prepareOrganizationSyncSlice(org, "fp_oldhash00");
    expect(slice.profile.logoDataUrl).toBeNull();
    expect(slice.logoAsset?.logoDataUrl).toBe(logo);
    expect(slice.logoAsset?.logoHash).toBe(org.logoHash);
  });
});
