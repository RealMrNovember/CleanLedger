import type { ServiceType } from "../schema/index";
import type { ProductColorPreset } from "../colors/product-palette";
import {
  findPresetByValue,
  normalizeHexColor,
  resolveColorDisplay,
} from "../colors/product-palette";
import { i18nCatalogs } from "./catalogs";
import { getTranslationSafe } from "./get-translation-safe";
import type { Locale } from "./locale";
import type { TranslateFn } from "./labels";

/** Seed / catalog product icon slugs stored in DB as `iconName`. */
export const CATALOG_PRODUCT_SLUGS = [
  "shirt",
  "pants",
  "jacket",
  "skirt",
  "dress",
  "suit",
  "coat",
  "sweater",
  "quilt",
  "blanket",
  "curtain",
  "bridal",
] as const;

export type CatalogProductSlug = (typeof CATALOG_PRODUCT_SLUGS)[number];

const PRODUCT_NAME_ALIASES: Record<string, CatalogProductSlug> = {
  gömlek: "shirt",
  shirt: "shirt",
  pantolon: "pants",
  pants: "pants",
  ceket: "jacket",
  jacket: "jacket",
  etek: "skirt",
  skirt: "skirt",
  elbise: "dress",
  dress: "dress",
  "takım elbise": "suit",
  suit: "suit",
  mont: "coat",
  coat: "coat",
  kazak: "sweater",
  sweater: "sweater",
  yorgan: "quilt",
  quilt: "quilt",
  battaniye: "blanket",
  blanket: "blanket",
  perde: "curtain",
  curtain: "curtain",
  gelinlik: "bridal",
  bridal: "bridal",
};

const COLOR_HEX_SLUGS: Record<string, string> = {
  "#1a1a1a": "black",
  "#f5f5f5": "white",
  "#1e3a5f": "navy",
  "#6b7280": "gray",
  "#dc2626": "red",
  "#6b705c": "khaki",
  "#78350f": "brown",
  "#d4c4a8": "beige",
  "#2563eb": "blue",
  "#16a34a": "green",
};

const COLOR_LABEL_ALIASES: Record<string, string> = {
  siyah: "black",
  black: "black",
  beyaz: "white",
  white: "white",
  lacivert: "navy",
  navy: "navy",
  gri: "gray",
  gray: "gray",
  grey: "gray",
  kırmızı: "red",
  kirmizi: "red",
  red: "red",
  haki: "khaki",
  khaki: "khaki",
  kahverengi: "brown",
  brown: "brown",
  bej: "beige",
  beige: "beige",
  mavi: "blue",
  blue: "blue",
  yeşil: "green",
  yesil: "green",
  green: "green",
};

export function productTranslationKey(slug: string): string {
  return `products.${slug}`;
}

export function colorTranslationKey(slug: string): string {
  return `colors.${slug}`;
}

export function serviceTranslationKey(serviceType: ServiceType): string {
  return `enums.service.${serviceType}`;
}

/** Locale-aware service label — looks up `enums.service.<type>`, falls back to English. */
export function translateService(
  locale: Locale,
  serviceType: ServiceType
): string {
  return getTranslationSafe(
    i18nCatalogs,
    locale,
    serviceTranslationKey(serviceType)
  );
}

export function resolveProductSlug(
  name: string,
  iconName?: string | null
): CatalogProductSlug | null {
  const fromIcon = iconName?.trim().toLowerCase();
  if (fromIcon && CATALOG_PRODUCT_SLUGS.includes(fromIcon as CatalogProductSlug)) {
    return fromIcon as CatalogProductSlug;
  }
  const normalizedName = name.trim().toLowerCase();
  const fromAlias = PRODUCT_NAME_ALIASES[normalizedName];
  if (fromAlias) return fromAlias;
  if (CATALOG_PRODUCT_SLUGS.includes(normalizedName as CatalogProductSlug)) {
    return normalizedName as CatalogProductSlug;
  }
  return null;
}

export function resolveColorSlug(hex: string, label?: string): string | null {
  const normalizedHex = normalizeHexColor(hex).toLowerCase();
  const fromHex = COLOR_HEX_SLUGS[normalizedHex];
  if (fromHex) return fromHex;
  if (label) {
    const fromLabel = COLOR_LABEL_ALIASES[label.trim().toLowerCase()];
    if (fromLabel) return fromLabel;
  }
  return null;
}

function resolveProductLabel(
  locale: Locale,
  product: { name: string; iconName?: string | null }
): string {
  const slug = resolveProductSlug(product.name, product.iconName);
  if (!slug) return product.name;

  const key = productTranslationKey(slug);
  const translated = getTranslationSafe(i18nCatalogs, locale, key);
  if (translated === key) return product.name;
  return translated;
}

function resolveColorLabel(
  locale: Locale,
  preset: { label: string; hex: string }
): string {
  const slug = resolveColorSlug(preset.hex, preset.label);
  if (!slug) return preset.label;

  const key = colorTranslationKey(slug);
  const translated = getTranslationSafe(i18nCatalogs, locale, key);
  if (translated === key) return preset.label;
  return translated;
}

/** Locale-aware product label — looks up `products.<slug>`, falls back to stored name. */
export function translateProduct(
  locale: Locale,
  product: { name: string; iconName?: string | null }
): string {
  return resolveProductLabel(locale, product);
}

/** Locale-aware color label — looks up `colors.<slug>`, falls back to stored label. */
export function translateColor(
  locale: Locale,
  preset: { label: string; hex: string }
): string {
  return resolveColorLabel(locale, preset);
}

/** Hook-friendly variant using a `t()` function (EN fallback already applied). */
export function translateProductName(
  t: TranslateFn,
  product: { name: string; iconName?: string | null }
): string {
  const slug = resolveProductSlug(product.name, product.iconName);
  if (!slug) return product.name;
  const key = productTranslationKey(slug);
  const translated = t(key);
  return translated === key ? product.name : translated;
}

/** Hook-friendly variant using a `t()` function (EN fallback already applied). */
export function translateColorLabel(
  t: TranslateFn,
  preset: { label: string; hex: string }
): string {
  const slug = resolveColorSlug(preset.hex, preset.label);
  if (!slug) return preset.label;
  const key = colorTranslationKey(slug);
  const translated = t(key);
  return translated === key ? preset.label : translated;
}

export function resolveColorDisplayI18n(
  t: TranslateFn,
  palette: ProductColorPreset[],
  value: string | null | undefined
): ProductColorPreset | null {
  const raw = resolveColorDisplay(palette, value);
  if (!raw) return null;
  return { ...raw, label: translateColorLabel(t, raw) };
}

export function summarizeOrderItemColorsI18n(
  t: TranslateFn,
  colors: Array<string | null | undefined>,
  palette: ProductColorPreset[]
): Array<{ label: string; hex: string }> {
  const seen = new Set<string>();
  const result: Array<{ label: string; hex: string }> = [];
  for (const raw of colors) {
    if (!raw) continue;
    const display = resolveColorDisplayI18n(t, palette, raw);
    if (!display) continue;
    const key = display.hex.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(display);
  }
  return result;
}

export function colorMatchesSearchI18n(
  t: TranslateFn,
  palette: ProductColorPreset[],
  colorValue: string | null | undefined,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const display = resolveColorDisplayI18n(t, palette, colorValue);
  if (!display) return false;
  if (display.label.toLowerCase().includes(q)) return true;
  if (display.hex.toLowerCase().includes(q)) return true;
  const preset = findPresetByValue(palette, colorValue);
  if (preset && preset.label.toLowerCase().includes(q)) return true;
  return false;
}
