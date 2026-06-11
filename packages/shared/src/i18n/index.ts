import { en, type MessageTree } from "./messages/en";
import { tr } from "./messages/tr";
import { az } from "./messages/az";
import { ru } from "./messages/ru";
import { fr } from "./messages/fr";
import { it } from "./messages/it";

export type Locale = "en" | "tr" | "az" | "ru" | "fr" | "it";

export const SUPPORTED_LOCALES: Locale[] = ["en", "tr", "az", "ru", "fr", "it"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
  az: "Azərbaycan",
  ru: "Русский",
  fr: "Français",
  it: "Italiano",
};

export const LOCALE_STORAGE_KEY = "cleanledger_locale";

const catalogs: Record<Locale, MessageTree> = { en, tr, az, ru, fr, it };

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as string[]).includes(value);
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

function getNestedValue(tree: MessageTree, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = tree;
  for (const part of parts) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string>
): string {
  const primary = getNestedValue(catalogs[locale], key);
  const fallback = getNestedValue(catalogs.en, key);
  let text = primary ?? fallback ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{{${name}}}`, value);
    }
  }
  return text;
}

export function collectMessageKeys(
  tree: Record<string, unknown>,
  prefix = ""
): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") keys.push(path);
    else if (value && typeof value === "object") {
      keys.push(...collectMessageKeys(value as Record<string, unknown>, path));
    }
  }
  return keys.sort();
}

export { en, tr, az, ru, fr, it };
export type { MessageTree };
