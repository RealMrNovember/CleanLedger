import { describe, expect, it } from "vitest";
import { emptyLocalDb } from "../migrations/v3";
import {
  buildOrgScopedStorageKey,
  entityBelongsToTenant,
  isolateLocalDbForTenant,
  resolveTenantWebStorageKey,
} from "./isolation";

describe("tenant isolation", () => {
  it("builds org-scoped storage keys", () => {
    expect(buildOrgScopedStorageKey("cleanledger_web_db_v3", "mike@ross.com")).toBe(
      "cleanledger_web_db_v3:mike%40ross.com"
    );
  });

  it("isolates customers by organizationId", () => {
    const db = emptyLocalDb();
    db.organizationProfile = {
      id: 1,
      globalId: "g1",
      organizationId: "mike@ross.com",
      companyName: "Mike Cleaning",
      adminName: "Mike",
      email: "mike@ross.com",
      phone: "",
      address: "",
      logoDataUrl: null,
      logoHash: null,
      authToken: "t",
      trialEndsAt: "",
      updatedAt: new Date().toISOString(),
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

  it("migrates legacy storage only for matching org", () => {
    const store = new Map<string, string>();
    const legacyDb = emptyLocalDb();
    legacyDb.organizationProfile = {
      id: 1,
      globalId: "g1",
      organizationId: "a@test.com",
      companyName: "A",
      adminName: "A",
      email: "a@test.com",
      phone: "",
      address: "",
      logoDataUrl: null,
      logoHash: null,
      authToken: "t",
      trialEndsAt: "",
      updatedAt: "",
    };
    store.set("db", JSON.stringify(legacyDb));

    const keyA = resolveTenantWebStorageKey("db", "a@test.com", {
      read: (k) => store.get(k) ?? null,
      write: (k, v) => store.set(k, v),
    });
    expect(keyA).toBe("db:a%40test.com");
    expect(store.has("db:a%40test.com")).toBe(true);

    const keyB = resolveTenantWebStorageKey("db", "b@test.com", {
      read: (k) => store.get(k) ?? null,
      write: (k, v) => store.set(k, v),
    });
    expect(keyB).toBe("db:b%40test.com");
    expect(store.has("db:b%40test.com")).toBe(false);
  });

  it("entityBelongsToTenant is strict", () => {
    expect(
      entityBelongsToTenant({ organizationId: "mike@ross.com" }, "mike@ross.com")
    ).toBe(true);
    expect(
      entityBelongsToTenant({ organizationId: null }, "mike@ross.com")
    ).toBe(false);
  });
});
