import { describe, expect, it } from "vitest";
import {
  findCustomerForOrder,
  phonesMatch,
  resolveCustomerNameForOrder,
} from "./resolve";

describe("phonesMatch", () => {
  it("matches equivalent TR phone formats", () => {
    expect(phonesMatch("+90 535 489 50 50", "05354895050")).toBe(true);
    expect(phonesMatch("905354895050", "5354895050")).toBe(true);
  });

  it("rejects different numbers", () => {
    expect(phonesMatch("05351111111", "05352222222")).toBe(false);
  });
});

describe("resolveCustomerNameForOrder", () => {
  const customers = [
    { id: 1, phone: "05354895050", name: "Ayşe", lastName: "Yılmaz" },
    { id: 2, phone: "+90 532 000 00 00", name: "Mehmet", lastName: null },
  ];

  it("resolves by customerId", () => {
    expect(
      resolveCustomerNameForOrder(
        { customerId: 1, customerPhone: "000" },
        customers
      )
    ).toBe("Ayşe Yılmaz");
  });

  it("falls back to normalized phone", () => {
    expect(
      resolveCustomerNameForOrder(
        { customerId: null, customerPhone: "+90 535 489 50 50" },
        customers
      )
    ).toBe("Ayşe Yılmaz");
  });

  it("returns undefined when no customer", () => {
    expect(
      findCustomerForOrder(
        { customerId: null, customerPhone: "05999999999" },
        customers
      )
    ).toBeUndefined();
  });
});
