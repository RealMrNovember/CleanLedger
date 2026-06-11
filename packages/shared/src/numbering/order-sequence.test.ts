import { describe, expect, it } from "vitest";
import {
  buildMaxSequenceByYear,
  resolveOrderNumberConflict,
  remapItemNumbersForOrder,
} from "./order-sequence";

describe("buildMaxSequenceByYear", () => {
  it("tracks highest sequence per year", () => {
    const map = buildMaxSequenceByYear([
      { orderNumber: "CL-2026-000010" },
      { orderNumber: "CL-2026-000157" },
      { orderNumber: "CL-2025-000999" },
    ]);
    expect(map.get(2026)).toBe(157);
    expect(map.get(2025)).toBe(999);
  });
});

describe("resolveOrderNumberConflict", () => {
  it("returns incoming number when no conflict", () => {
    const result = resolveOrderNumberConflict(
      [{ globalId: "a", orderNumber: "CL-2026-000001" }],
      { globalId: "b", orderNumber: "CL-2026-000002" }
    );
    expect(result.orderNumber).toBe("CL-2026-000002");
    expect(result.reassignments).toEqual([]);
  });

  it("reassigns conflicting order when incoming wins", () => {
    const result = resolveOrderNumberConflict(
      [{ globalId: "existing", orderNumber: "CL-2026-000100" }],
      { globalId: "new", orderNumber: "CL-2026-000100" },
      true
    );
    expect(result.orderNumber).toBe("CL-2026-000100");
    expect(result.reassignments).toHaveLength(1);
    expect(result.reassignments[0].globalId).toBe("existing");
    expect(result.reassignments[0].orderNumber).toBe("CL-2026-000101");
  });

  it("reassigns incoming when it loses", () => {
    const result = resolveOrderNumberConflict(
      [{ globalId: "existing", orderNumber: "CL-2026-000050" }],
      { globalId: "new", orderNumber: "CL-2026-000050" },
      false
    );
    expect(result.orderNumber).toBe("CL-2026-000051");
    expect(result.reassignments).toEqual([]);
  });
});

describe("remapItemNumbersForOrder", () => {
  it("rebuilds item numbers after order number change", () => {
    const mapped = remapItemNumbersForOrder(
      "CL-2026-000200",
      [
        { id: 10, orderId: 5, itemNumber: "CL-2026-000100-01" },
        { id: 11, orderId: 5, itemNumber: "CL-2026-000100-02" },
        { id: 12, orderId: 6, itemNumber: "CL-2026-000099-01" },
      ],
      5
    );
    expect(mapped).toEqual([
      { id: 10, itemNumber: "CL-2026-000200-01" },
      { id: 11, itemNumber: "CL-2026-000200-02" },
    ]);
  });
});
