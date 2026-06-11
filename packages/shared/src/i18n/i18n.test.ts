import { describe, expect, it } from "vitest";
import {
  SUPPORTED_LOCALES,
  az,
  collectMessageKeys,
  detectBrowserLocale,
  en,
  fr,
  it as itLocale,
  ru,
  tr,
  translate,
} from "./index";

describe("i18n", () => {
  it("has matching keys across all locales", () => {
    const baseKeys = collectMessageKeys(en);
    const catalogs = { tr, az, ru, fr, it: itLocale };
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      const keys = collectMessageKeys(catalogs[locale as keyof typeof catalogs]);
      expect(keys).toEqual(baseKeys);
    }
  });

  it("interpolates params", () => {
    expect(
      translate("en", "common.welcome", {
        name: "Mike",
        company: "Mike Cleaning",
      })
    ).toBe("Welcome, Mike — Mike Cleaning");
  });

  it("detectBrowserLocale returns supported locale", () => {
    const locale = detectBrowserLocale();
    expect(SUPPORTED_LOCALES).toContain(locale);
  });
});
