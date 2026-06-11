import { describe, expect, it } from "vitest";
import { isUuidV7 } from "../ids/uuid-v7";
import {
  emptyLocalDb,
  mergeOrganizationProfile,
  safeMigrateRecordToV3,
} from "./v3";

describe("safeMigrateRecordToV3", () => {
  it("geçersiz kök veride boş DB döner", () => {
    const { db, warnings } = safeMigrateRecordToV3(null);
    expect(db.products).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("bozuk müşteri kayıtlarını atlar", () => {
    const { db, warnings } = safeMigrateRecordToV3({
      schemaVersion: 2,
      customers: [{ id: "not-a-number", phone: 123 }],
      orders: [],
      orderItems: [],
    });
    expect(db.customers).toHaveLength(0);
    expect(warnings.some((w) => w.includes("customers"))).toBe(true);
  });

  it("v2 org birleştirmede globalId v7 üretir", () => {
    const org = mergeOrganizationProfile(null, {
      companyName: "Test Kuru",
      email: "test@kuru.com",
      phone: "555",
    });
    expect(org?.globalId).toBeTruthy();
    expect(isUuidV7(org!.globalId!)).toBe(true);
    expect(org?.organizationId).toBe("test@kuru.com");
  });

  it("kritik parse hatasında emptyLocalDb fallback", () => {
    const poison = {
      schemaVersion: 2,
      get customers() {
        throw new Error("corrupt");
      },
    };
    const { db, warnings } = safeMigrateRecordToV3(poison);
    expect(db.schemaVersion).toBe(emptyLocalDb().schemaVersion);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
