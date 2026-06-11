import { describe, expect, it } from "vitest";
import {
  SUPPORTED_LOCALES,
  collectMessageKeys,
  en,
  tr,
  az,
  ru,
  fr,
  it as itLocale,
  getTranslationSafe,
  getNestedMessageValue,
  getAllCatalogs,
} from "./index";
import { enCatalog } from "./messages/en-catalog";
import { trCatalog } from "./messages/tr-catalog";

const catalogs = {
  tr,
  az,
  ru,
  fr,
  it: itLocale,
};

describe("i18n catalog parity", () => {
  const enKeys = collectMessageKeys(en);

  it("English catalog is the key source of truth", () => {
    expect(enKeys.length).toBeGreaterThan(400);
    expect(collectMessageKeys(enCatalog)).toEqual(enKeys);
  });

  it("Turkish catalog contains every English key", () => {
    const trKeys = collectMessageKeys(tr);
    const trCatalogKeys = collectMessageKeys(trCatalog);
    expect(trKeys).toEqual(enKeys);
    expect(trCatalogKeys).toEqual(enKeys);
  });

  it("every locale tree exposes the same key set as English", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      const keys = collectMessageKeys(catalogs[locale as keyof typeof catalogs]);
      const missing = enKeys.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !enKeys.includes(k));
      expect(
        missing,
        `${locale} missing keys:\n${missing.slice(0, 20).join("\n")}`
      ).toEqual([]);
      expect(extra, `${locale} extra keys:\n${extra.join("\n")}`).toEqual([]);
    }
  });

  it("getTranslationSafe falls back to English for missing leaf values", () => {
    const sampleKey = "errors.licenseVerifyFailed";
    expect(getTranslationSafe("az", sampleKey)).toBe(
      getTranslationSafe("en", sampleKey)
    );
    expect(getTranslationSafe("ru", "settings.tabs.prices")).toBe(
      getTranslationSafe("en", "settings.tabs.prices")
    );
  });

  it("product and color keys resolve via nested catalog paths", () => {
    expect(getTranslationSafe("en", "products.shirt")).toBe("Shirt");
    expect(getTranslationSafe("tr", "products.shirt")).toBe("Gömlek");
    expect(getTranslationSafe("tr", "colors.black")).toBe("Siyah");
    expect(collectMessageKeys(en)).toContain("products.shirt");
    expect(collectMessageKeys(en)).toContain("colors.black");
  });

  it("getTranslationSafe never returns empty when English has a value", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of enKeys) {
        const enVal = getNestedMessageValue(en, key);
        if (!enVal?.trim()) continue;
        const resolved = getTranslationSafe(locale, key);
        expect(resolved.trim(), `${locale} ${key}`).not.toBe("");
      }
    }
  });

  it("all catalogs are built from shared package only", () => {
    const all = getAllCatalogs();
    for (const locale of SUPPORTED_LOCALES) {
      expect(all[locale]).toBeDefined();
      expect(collectMessageKeys(all[locale]).length).toBe(enKeys.length);
    }
  });
});
