import { describe, expect, it } from "vitest";
import {
  SUPPORTED_LOCALES,
  detectBrowserLocale,
  getTranslationSafe,
  translate,
} from "./index";

describe("i18n runtime", () => {
  it("getTranslationSafe interpolates params", () => {
    expect(
      getTranslationSafe("en", "common.welcome", {
        name: "Mike",
        company: "Mike Cleaning",
      })
    ).toBe("Welcome, Mike — Mike Cleaning");
  });

  it("translate is an alias for getTranslationSafe", () => {
    expect(translate("tr", "common.save")).toBe(getTranslationSafe("tr", "common.save"));
  });

  it("detectBrowserLocale returns supported locale", () => {
    const locale = detectBrowserLocale();
    expect(SUPPORTED_LOCALES).toContain(locale);
  });

  it("unknown key returns key string only when absent in EN", () => {
    expect(getTranslationSafe("en", "nonexistent.key.path")).toBe(
      "nonexistent.key.path"
    );
  });

  it("resolves flat dotted keys inside enum sections", () => {
    expect(getTranslationSafe("en", "enums.service.dry_clean")).toBe(
      "Dry cleaning"
    );
    expect(getTranslationSafe("tr", "enums.service.dry_clean")).toBe(
      "Kuru Temizleme"
    );
  });
});
