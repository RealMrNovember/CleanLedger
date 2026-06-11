import { describe, expect, it } from "vitest";
import { emptyLocalDb } from "../migrations/v3";
import { applySyncChange, changeMatchesTenant } from "./merge";
import type { SyncQueueEntry } from "./types";

describe("sync merge tenant guard", () => {
  it("rejects changes without organizationId", () => {
    const db = emptyLocalDb();
    db.organizationProfile = {
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
    const change: SyncQueueEntry = {
      id: "1",
      organizationId: "",
      entityType: "customer",
      entityGlobalId: "c1",
      operation: "create",
      clientUpdatedAt: new Date().toISOString(),
      payload: {},
      syncedAt: null,
    };
    expect(changeMatchesTenant(change, "a@test.com")).toBe(false);
    expect(applySyncChange(db, change).customers).toHaveLength(0);
  });

  it("rejects foreign organizationId", () => {
    const db = emptyLocalDb();
    db.organizationProfile = {
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
    const change: SyncQueueEntry = {
      id: "2",
      organizationId: "b@test.com",
      entityType: "customer",
      entityGlobalId: "c2",
      operation: "create",
      clientUpdatedAt: new Date().toISOString(),
      payload: {
        name: "Ali",
        phone: "05001112233",
      },
      syncedAt: null,
    };
    expect(changeMatchesTenant(change, "a@test.com")).toBe(false);
    expect(applySyncChange(db, change).customers).toHaveLength(0);
  });
});
