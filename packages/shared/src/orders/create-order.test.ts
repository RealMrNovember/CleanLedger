import { describe, expect, it } from "vitest";
import { computeCreateOrderFinancials } from "./create-order";

describe("computeCreateOrderFinancials", () => {
  it("computes totals and paid status for cash", () => {
    const result = computeCreateOrderFinancials({
      items: [{ subtotal: 100 }, { subtotal: 50 }],
      amountPaid: 150,
      paymentMethod: "cash",
    });
    expect(result.subtotalAmount).toBe(150);
    expect(result.totalAmount).toBe(150);
    expect(result.amountPaid).toBe(150);
    expect(result.balanceDue).toBe(0);
    expect(result.paymentStatus).toBe("paid");
  });

  it("zeroes amount paid for credit mode", () => {
    const result = computeCreateOrderFinancials({
      items: [{ subtotal: 200 }],
      amountPaid: 100,
      paymentMethod: "cash",
      paymentMode: "credit",
    });
    expect(result.amountPaid).toBe(0);
    expect(result.balanceDue).toBe(200);
  });
});
