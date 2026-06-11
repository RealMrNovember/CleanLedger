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

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  tr: "🇹🇷",
  az: "🇦🇿",
  ru: "🇷🇺",
  fr: "🇫🇷",
  it: "🇮🇹",
};

export const LOCALE_STORAGE_KEY = "cleanledger_locale";

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as string[]).includes(value);
}
