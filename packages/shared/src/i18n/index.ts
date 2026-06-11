import { i18nCatalogs } from "./catalogs";
import {
  getTranslationSafe as resolveTranslationSafe,
  getNestedMessageValue,
} from "./get-translation-safe";
import { assertI18nIntegrity } from "./integrity-check";
import { collectMessageKeys } from "./collect-keys";
import {
  type Locale,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  LOCALE_STORAGE_KEY,
  isLocale,
} from "./locale";
import type { MessageTree } from "./messages/types";

export type { Locale };
export {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  LOCALE_STORAGE_KEY,
  isLocale,
};

const catalogs = i18nCatalogs;

/**
 * Pre-build integrity gate — runs when the i18n module loads (skipped under Vitest).
 * Fails fast if any locale catalog diverges from English key parity.
 */
const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;
if (runtimeEnv?.VITEST !== "true") {
  assertI18nIntegrity(catalogs);
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const raw of langs) {
    const base = raw.trim().toLowerCase().split("-")[0] ?? "";
    if (isLocale(base)) return base;
  }
  return "en";
}

export function readStoredLocale(): Locale | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    return raw && isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function resolveLocale(): Locale {
  return readStoredLocale() ?? detectBrowserLocale();
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

/** Resolve a key with mandatory English fallback (never empty when EN exists). */
export function getTranslationSafe(
  locale: Locale,
  key: string,
  params?: Record<string, string>
): string {
  return resolveTranslationSafe(catalogs, locale, key, params);
}

/** @alias getTranslationSafe */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string>
): string {
  return getTranslationSafe(locale, key, params);
}

export function getCatalog(locale: Locale): MessageTree {
  return catalogs[locale];
}

export function getAllCatalogs(): Record<Locale, MessageTree> {
  return catalogs;
}

export { collectMessageKeys };
export { getNestedMessageValue };
export { assertI18nIntegrity, I18nIntegrityError } from "./integrity-check";
export { i18nCatalogs } from "./catalogs";
export {
  translateProduct,
  translateColor,
  translateProductName,
  translateColorLabel,
  productTranslationKey,
  colorTranslationKey,
  serviceTranslationKey,
  translateService,
  CATALOG_PRODUCT_SLUGS,
  type CatalogProductSlug,
} from "./product-mapper";

export { en } from "./messages/en";
export { tr } from "./messages/tr";
export { az } from "./messages/az";
export { ru } from "./messages/ru";
export { fr } from "./messages/fr";
export { it } from "./messages/it";
export type { MessageTree };
export { enCatalog } from "./messages/en-catalog";
export { trCatalog } from "./messages/tr-catalog";
export { buildLocaleFromEnglish } from "./messages/build-locale";
export { deepMergeMessages } from "./messages/deep-merge";
