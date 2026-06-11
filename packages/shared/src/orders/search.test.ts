import { describe, expect, it } from "vitest";
import {
  filterTrackingOrders,
  orderMatchesTrackingSearch,
} from "./search";

describe("orderMatchesTrackingSearch", () => {
  const order = {
    orderNumber: "CL-2026-0042",
    customerName: "Ayşe Yılmaz",
    customerPhone: "+90 535 489 50 50",
  };

  it("matches order number", () => {
    expect(orderMatchesTrackingSearch(order, "0042")).toBe(true);
    expect(orderMatchesTrackingSearch(order, "cl-2026")).toBe(true);
  });

  it("matches customer name", () => {
    expect(orderMatchesTrackingSearch(order, "ayşe")).toBe(true);
    expect(orderMatchesTrackingSearch(order, "yılmaz")).toBe(true);
  });

  it("matches phone digits", () => {
    expect(orderMatchesTrackingSearch(order, "535489")).toBe(true);
    expect(orderMatchesTrackingSearch(order, "905354895050")).toBe(true);
  });

  it("returns true for empty query", () => {
    expect(orderMatchesTrackingSearch(order, "")).toBe(true);
    expect(orderMatchesTrackingSearch(order, "   ")).toBe(true);
  });

  it("matches item colors", () => {
    const withColors = {
      ...order,
      itemColors: [{ label: "Siyah", hex: "#1a1a1a" }],
    };
    expect(orderMatchesTrackingSearch(withColors, "siyah")).toBe(true);
    expect(orderMatchesTrackingSearch(withColors, "1a1a1a")).toBe(true);
    expect(orderMatchesTrackingSearch(withColors, "beyaz")).toBe(false);
  });

  it("matches item numbers", () => {
    const withItems = {
      ...order,
      itemNumbers: ["CL-2026-000042-01"],
    };
    expect(orderMatchesTrackingSearch(withItems, "000042-01")).toBe(true);
    expect(orderMatchesTrackingSearch(withItems, "cl-2026-000042")).toBe(true);
  });
});

describe("filterTrackingOrders", () => {
  const orders = [
    {
      orderNumber: "A-1",
      customerName: "Ali",
      customerPhone: "555",
      orderStatus: "preparing",
    },
    {
      orderNumber: "B-2",
      customerName: "Veli",
      customerPhone: "666",
      orderStatus: "delivered",
    },
  ];

  it("filters by delivery status and query", () => {
    expect(filterTrackingOrders(orders, "", "active")).toHaveLength(1);
    expect(filterTrackingOrders(orders, "", "delivered")).toHaveLength(1);
    expect(filterTrackingOrders(orders, "veli", "all")).toHaveLength(1);
    expect(filterTrackingOrders(orders, "ali", "delivered")).toHaveLength(0);
  });
});
