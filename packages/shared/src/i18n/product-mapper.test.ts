import { describe, expect, it } from "vitest";
import {
  translateProduct,
  translateColor,
  translateProductName,
  translateColorLabel,
  translateService,
} from "./product-mapper";
import { getTranslationSafe } from "./index";

describe("product-mapper", () => {
  it("translates catalog products by iconName slug key", () => {
    expect(
      translateProduct("en", { name: "Gömlek", iconName: "shirt" })
    ).toBe("Shirt");
    expect(
      translateProduct("tr", { name: "Gömlek", iconName: "shirt" })
    ).toBe("Gömlek");
  });

  it("falls back to stored name for custom products", () => {
    expect(
      translateProduct("tr", { name: "Özel Ürün", iconName: "custom" })
    ).toBe("Özel Ürün");
  });

  it("translates colors by hex slug with label fallback", () => {
    expect(
      translateColor("en", { label: "Siyah", hex: "#1a1a1a" })
    ).toBe("Black");
    expect(
      translateColor("tr", { label: "Siyah", hex: "#1a1a1a" })
    ).toBe("Siyah");
  });

  it("translates service types via enums.service keys", () => {
    expect(translateService("en", "dry_clean")).toBe("Dry cleaning");
    expect(translateService("tr", "dry_clean")).toBe("Kuru Temizleme");
  });

  it("hook variants use t() with EN fallback", () => {
    const t = (key: string) => getTranslationSafe("az", key);
    expect(
      translateProductName(t, { name: "Shirt", iconName: "shirt" })
    ).toBe(getTranslationSafe("az", "products.shirt"));
    expect(translateColorLabel(t, { label: "Black", hex: "#1a1a1a" })).toBe(
      getTranslationSafe("az", "colors.black")
    );
  });
});
