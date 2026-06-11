import { describe, expect, it } from "vitest";
import {
  countItemReadiness,
  deriveOrderStatusFromItems,
  nextItemStatus,
} from "./item-status";

describe("deriveOrderStatusFromItems", () => {
  it("marks order ready when all items ready", () => {
    const status = deriveOrderStatusFromItems(
      [
        { itemStatus: "ready" },
        { itemStatus: "delivered" },
      ],
      "preparing"
    );
    expect(status).toBe("ready");
  });

  it("keeps preparing when partial ready", () => {
    const status = deriveOrderStatusFromItems(
      [
        { itemStatus: "ready" },
        { itemStatus: "processing" },
      ],
      "preparing"
    );
    expect(status).toBe("preparing");
  });

  it("does not change delivered orders", () => {
    const status = deriveOrderStatusFromItems(
      [{ itemStatus: "received" }],
      "delivered"
    );
    expect(status).toBe("delivered");
  });
});

describe("countItemReadiness", () => {
  it("detects partial readiness", () => {
    expect(
      countItemReadiness([
        { itemStatus: "ready" },
        { itemStatus: "qc" },
      ])
    ).toEqual({ ready: 1, total: 2, partial: true });
  });
});

describe("nextItemStatus", () => {
  it("advances workflow", () => {
    expect(nextItemStatus("received")).toBe("preparing");
    expect(nextItemStatus("ready")).toBe("delivered");
    expect(nextItemStatus("delivered")).toBe(null);
  });
});
