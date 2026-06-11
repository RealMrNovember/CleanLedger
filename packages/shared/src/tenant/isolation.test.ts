import { describe, expect, it } from "vitest";
import { emptyLocalDb } from "../migrations/v3";
import {
  bootstrapTenantWebStorage,
  buildOrgScopedStorageKey,
  entityBelongsToTenant,
  extractTenantDbFromLegacy,
  hasBusinessData,
  isolateLocalDbForTenant,
  tenantOwnsLegacyDb,
} from "./isolation";

function profileFor(email: string) {
  return {
    id: 1,
    globalId: "g1",
    organizationId: "",
    companyName: "Test Co",
    adminName: "Admin",
    email,
    phone: "",
    address: "",
    logoDataUrl: null,
    logoHash: null,
    authToken: "t",
    trialEndsAt: "",
    updatedAt: new Date().toISOString(),
  };
}

describe("tenant isolation", () => {
  it("builds org-scoped storage keys", () => {
    expect(buildOrgScopedStorageKey("cleanledger_web_db_v3", "mike@ross.com")).toBe(
      "cleanledger_web_db_v3:mike%40ross.com"
    );
  });

  it("isolates customers by organizationId", () => {
    const db = emptyLocalDb();
    db.organizationProfile = {
      ...profileFor("mike@ross.com"),
      organizationId: "mike@ross.com",
      companyName: "Mike Cleaning",
    };
    db.customers = [
      {
        id: 1,
        globalId: "c1",
        organizationId: "other@test.com",
        branchId: null,
        name: "Ali",
        lastName: "",
        phone: "05001112233",
        notes: "",
        address: "",
        tagId: 1,
        creditBalance: 0,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: 2,
        globalId: "c2",
        organizationId: "mike@ross.com",
        branchId: null,
        name: "Veli",
        lastName: "",
        phone: "05004445566",
        notes: "",
        address: "",
        tagId: 1,
        creditBalance: 0,
        createdAt: "",
        updatedAt: "",
      },
    ];

    const isolated = isolateLocalDbForTenant(db, "mike@ross.com");
    expect(isolated.customers).toHaveLength(1);
    expect(isolated.customers[0]?.name).toBe("Veli");
  });

  it("keeps legacy unscoped customers when profile email matches tenant", () => {
    const db = emptyLocalDb();
    db.organizationProfile = profileFor("test@deneme.com");
    db.customers = [
      {
        id: 1,
        globalId: "c1",
        organizationId: null,
        branchId: null,
        name: "Mikail",
        lastName: "",
        phone: "05354895050",
        notes: "",
        address: "",
        tagId: 1,
        creditBalance: 0,
        createdAt: "",
        updatedAt: "",
      },
    ];

    expect(tenantOwnsLegacyDb(db, "test@deneme.com")).toBe(true);
    const slice = extractTenantDbFromLegacy(db, "test@deneme.com");
    expect(slice.customers).toHaveLength(1);
    expect(slice.customers[0]?.organizationId).toBe("test@deneme.com");
  });

  it("does not give legacy customers to a different tenant", () => {
    const db = emptyLocalDb();
    db.organizationProfile = profileFor("test@deneme.com");
    db.customers = [
      {
        id: 1,
        globalId: "c1",
        organizationId: null,
        branchId: null,
        name: "Mikail",
        lastName: "",
        phone: "05354895050",
        notes: "",
        address: "",
        tagId: 1,
        creditBalance: 0,
        createdAt: "",
        updatedAt: "",
      },
    ];

    const slice = extractTenantDbFromLegacy(db, "mike@ross.com");
    expect(slice.customers).toHaveLength(0);
    expect(hasBusinessData(slice)).toBe(false);
  });

  it("bootstraps org storage from legacy by profile email", () => {
    const store = new Map<string, string>();
    const legacyDb = emptyLocalDb();
    legacyDb.organizationProfile = profileFor("test@deneme.com");
    legacyDb.customers = [
      {
        id: 1,
        globalId: "c1",
        organizationId: null,
        branchId: null,
        name: "Mikail",
        lastName: "",
        phone: "05354895050",
        notes: "",
        address: "",
        tagId: 1,
        creditBalance: 0,
        createdAt: "",
        updatedAt: "",
      },
    ];
    store.set("db", JSON.stringify(legacyDb));

    const key = bootstrapTenantWebStorage("db", "test@deneme.com", {
      read: (k) => store.get(k) ?? null,
      write: (k, v) => store.set(k, v),
    }, (raw) => JSON.parse(raw) as typeof legacyDb, (d) => JSON.stringify(d));

    expect(key).toBe("db:test%40deneme.com");
    const saved = JSON.parse(store.get(key)!) as typeof legacyDb;
    expect(saved.customers).toHaveLength(1);
    expect(store.has("db")).toBe(true);
  });

  it("recovers empty org key from legacy on bootstrap", () => {
    const store = new Map<string, string>();
    const legacyDb = emptyLocalDb();
    legacyDb.organizationProfile = profileFor("test@deneme.com");
    legacyDb.customers = [
      {
        id: 1,
        globalId: "c1",
        organizationId: null,
        branchId: null,
        name: "Mikail",
        lastName: "",
        phone: "05354895050",
        notes: "",
        address: "",
        tagId: 1,
        creditBalance: 0,
        createdAt: "",
        updatedAt: "",
      },
    ];
    store.set("db", JSON.stringify(legacyDb));
    store.set("db:test%40deneme.com", JSON.stringify(emptyLocalDb()));

    bootstrapTenantWebStorage("db", "test@deneme.com", {
      read: (k) => store.get(k) ?? null,
      write: (k, v) => store.set(k, v),
    }, (raw) => JSON.parse(raw) as typeof legacyDb, (d) => JSON.stringify(d));

    const saved = JSON.parse(store.get("db:test%40deneme.com")!) as typeof legacyDb;
    expect(saved.customers).toHaveLength(1);
  });

  it("entityBelongsToTenant respects legacy allowance", () => {
    expect(
      entityBelongsToTenant({ organizationId: "mike@ross.com" }, "mike@ross.com")
    ).toBe(true);
    expect(
      entityBelongsToTenant({ organizationId: null }, "mike@ross.com")
    ).toBe(false);
    expect(
      entityBelongsToTenant({ organizationId: null }, "mike@ross.com", {
        allowLegacyUnscoped: true,
      })
    ).toBe(true);
  });
});
