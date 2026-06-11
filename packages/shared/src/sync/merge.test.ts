import { describe, expect, it } from "vitest";
import { emptyLocalDb } from "../migrations/v3";
import { createGlobalId } from "../ids/global-id";
import { applySyncChanges } from "./merge";
import type { SyncQueueEntry } from "./types";

describe("applySyncChanges", () => {
  it("remote müşteri kaydını globalId ile ekler", () => {
    const db = emptyLocalDb();
    db.organizationProfile = {
      id: 1,
      globalId: createGlobalId(),
      organizationId: "a@b.com",
      companyName: "Test",
      adminName: "",
      email: "a@b.com",
      phone: "",
      address: "",
      logoDataUrl: null,
      logoHash: null,
      authToken: "t",
      trialEndsAt: "",
      updatedAt: new Date().toISOString(),
    };

    const gid = createGlobalId();
    const change: SyncQueueEntry = {
      id: createGlobalId(),
      organizationId: "a@b.com",
      entityType: "customer",
      entityGlobalId: gid,
      operation: "create",
      payload: {
        customer: {
          id: 99,
          globalId: gid,
          organizationId: "a@b.com",
          branchId: null,
          name: "Ali",
          lastName: "",
          phone: "555",
          notes: "",
          address: "",
          tagId: 1,
          creditBalance: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      },
      clientUpdatedAt: "2026-01-02T00:00:00.000Z",
      syncedAt: null,
    };

    const merged = applySyncChanges(db, [change]);
    expect(merged.customers).toHaveLength(1);
    expect(merged.customers[0]?.globalId).toBe(gid);
    expect(merged.customers[0]?.name).toBe("Ali");
  });

  it("remote ürün ve servis fiyatlarını globalId ile ekler", () => {
    const db = emptyLocalDb();
    db.organizationProfile = {
      id: 1,
      globalId: createGlobalId(),
      organizationId: "a@b.com",
      companyName: "Test",
      adminName: "",
      email: "a@b.com",
      phone: "",
      address: "",
      logoDataUrl: null,
      logoHash: null,
      authToken: "t",
      trialEndsAt: "",
      updatedAt: new Date().toISOString(),
    };

    const productGid = createGlobalId();
    const priceGid = createGlobalId();
    const change: SyncQueueEntry = {
      id: createGlobalId(),
      organizationId: "a@b.com",
      entityType: "product",
      entityGlobalId: productGid,
      operation: "create",
      payload: {
        product: {
          id: 99,
          globalId: productGid,
          organizationId: "a@b.com",
          name: "Gömlek",
          iconName: "shirt",
          basePrice: 100,
          sortOrder: 0,
        },
        servicePrices: [
          {
            id: 1,
            globalId: priceGid,
            organizationId: "a@b.com",
            productId: 99,
            serviceType: "wash_fold",
            price: 80,
          },
        ],
      },
      clientUpdatedAt: "2026-01-02T00:00:00.000Z",
      syncedAt: null,
    };

    const merged = applySyncChanges(db, [change]);
    expect(merged.products).toHaveLength(1);
    expect(merged.products[0]?.name).toBe("Gömlek");
    expect(merged.servicePrices).toHaveLength(1);
    expect(merged.servicePrices[0]?.productId).toBe(merged.products[0]?.id);
    expect(merged.servicePrices[0]?.price).toBe(80);
  });
});
