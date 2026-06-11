import {
  Shirt,
  Layers2,
  BedDouble,
  TableProperties,
  Blinds,
  Sofa,
  Ribbon,
  ShoppingBag,
  Sparkles,
  Gem,
  Footprints,
  Crown,
  Wind,
  type LucideIcon,
} from "lucide-react";
import {
  ArtPants,
  ArtSkirt,
  ArtDress,
  ArtJacket,
  ArtCoat,
  ArtBlanket,
  ArtCarpet,
  ArtBridal,
} from "./product-art";

export type ProductIconComponent = LucideIcon | typeof ArtPants;

export interface ProductVisualTheme {
  gradient: string;
  icon: string;
  ring: string;
  shadow: string;
}

export interface ProductIconOption {
  id: string;
  label: string;
  category: ProductIconCategory;
  Icon: ProductIconComponent;
  theme: ProductVisualTheme;
}

export type ProductIconCategory =
  | "Üst Giyim"
  | "Alt Giyim"
  | "Ev Tekstili"
  | "Özel";

const THEMES: Record<ProductIconCategory, ProductVisualTheme> = {
  "Üst Giyim": {
    gradient: "from-sky-100 via-cyan-50 to-white dark:from-sky-950/80 dark:via-slate-800 dark:to-slate-900",
    icon: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-200/80 dark:ring-sky-700/50",
    shadow: "shadow-sky-200/40 dark:shadow-sky-900/30",
  },
  "Alt Giyim": {
    gradient: "from-violet-100 via-fuchsia-50 to-white dark:from-violet-950/80 dark:via-slate-800 dark:to-slate-900",
    icon: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-200/80 dark:ring-violet-700/50",
    shadow: "shadow-violet-200/40 dark:shadow-violet-900/30",
  },
  "Ev Tekstili": {
    gradient: "from-amber-100 via-orange-50 to-white dark:from-amber-950/80 dark:via-slate-800 dark:to-slate-900",
    icon: "text-amber-800 dark:text-amber-300",
    ring: "ring-amber-200/80 dark:ring-amber-700/50",
    shadow: "shadow-amber-200/40 dark:shadow-amber-900/30",
  },
  Özel: {
    gradient: "from-rose-100 via-pink-50 to-white dark:from-rose-950/80 dark:via-slate-800 dark:to-slate-900",
    icon: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-200/80 dark:ring-rose-700/50",
    shadow: "shadow-rose-200/40 dark:shadow-rose-900/30",
  },
};

export const PRODUCT_ICON_OPTIONS: ProductIconOption[] = [
  { id: "shirt", label: "Gömlek", category: "Üst Giyim", Icon: Shirt, theme: THEMES["Üst Giyim"] },
  { id: "tshirt", label: "Tişört", category: "Üst Giyim", Icon: Shirt, theme: THEMES["Üst Giyim"] },
  { id: "sweater", label: "Kazak", category: "Üst Giyim", Icon: Shirt, theme: THEMES["Üst Giyim"] },
  { id: "jacket", label: "Ceket", category: "Üst Giyim", Icon: ArtJacket, theme: THEMES["Üst Giyim"] },
  { id: "coat", label: "Mont / Palto", category: "Üst Giyim", Icon: ArtCoat, theme: THEMES["Üst Giyim"] },
  { id: "suit", label: "Takım Elbise", category: "Üst Giyim", Icon: Layers2, theme: THEMES["Üst Giyim"] },
  { id: "pants", label: "Pantolon", category: "Alt Giyim", Icon: ArtPants, theme: THEMES["Alt Giyim"] },
  { id: "skirt", label: "Etek", category: "Alt Giyim", Icon: ArtSkirt, theme: THEMES["Alt Giyim"] },
  { id: "dress", label: "Elbise", category: "Alt Giyim", Icon: ArtDress, theme: THEMES["Alt Giyim"] },
  { id: "quilt", label: "Yorgan", category: "Ev Tekstili", Icon: BedDouble, theme: THEMES["Ev Tekstili"] },
  { id: "blanket", label: "Battaniye", category: "Ev Tekstili", Icon: ArtBlanket, theme: THEMES["Ev Tekstili"] },
  { id: "curtain", label: "Perde", category: "Ev Tekstili", Icon: Blinds, theme: THEMES["Ev Tekstili"] },
  { id: "carpet", label: "Halı", category: "Ev Tekstili", Icon: ArtCarpet, theme: THEMES["Ev Tekstili"] },
  { id: "tablecloth", label: "Masa Örtüsü", category: "Ev Tekstili", Icon: TableProperties, theme: THEMES["Ev Tekstili"] },
  { id: "sofa", label: "Koltuk", category: "Ev Tekstili", Icon: Sofa, theme: THEMES["Ev Tekstili"] },
  { id: "towel", label: "Havlu", category: "Ev Tekstili", Icon: Wind, theme: THEMES["Ev Tekstili"] },
  { id: "bag", label: "Çanta", category: "Özel", Icon: ShoppingBag, theme: THEMES.Özel },
  { id: "leather", label: "Deri Ürün", category: "Özel", Icon: Gem, theme: THEMES.Özel },
  { id: "bridal", label: "Gelinlik", category: "Özel", Icon: ArtBridal, theme: THEMES.Özel },
  { id: "sparkles", label: "Özel / Abiye", category: "Özel", Icon: Sparkles, theme: THEMES.Özel },
  { id: "tie", label: "Kravat", category: "Özel", Icon: Ribbon, theme: THEMES.Özel },
  { id: "shoe", label: "Ayakkabı", category: "Özel", Icon: Footprints, theme: THEMES.Özel },
  { id: "hat", label: "Şapka", category: "Özel", Icon: Crown, theme: THEMES.Özel },
];

/** Eski kayıtlar — yeni ikon kimliklerine yönlendirme */
const LEGACY_ICON_ALIASES: Record<string, string> = {
  bed: "quilt",
  lamp: "curtain",
  square: "carpet",
  layoutgrid: "skirt",
  briefcasebusiness: "jacket",
  jacket_old: "jacket",
  pants_old: "pants",
  coat_old: "coat",
  skirt_old: "skirt",
  blanket_old: "blanket",
  carpet_old: "carpet",
  bag_old: "bag",
  default: "shirt",
};

const ICON_MAP: Record<string, ProductIconOption> = Object.fromEntries(
  PRODUCT_ICON_OPTIONS.map((opt) => [opt.id, opt]),
);

/** Türkçe ürün adından en uygun ikon */
const NAME_KEYWORDS: { iconId: string; words: string[] }[] = [
  { iconId: "bridal", words: ["gelinlik", "gelin", "bridal"] },
  { iconId: "suit", words: ["takım elbise", "takim elbise", "smokin"] },
  { iconId: "coat", words: ["mont", "palto", "kaban", "pardösü", "pardosu"] },
  { iconId: "jacket", words: ["ceket", "blazer"] },
  { iconId: "shirt", words: ["gömlek", "gomlek"] },
  { iconId: "tshirt", words: ["tişört", "tisort", "t-shirt"] },
  { iconId: "sweater", words: ["kazak", "hırka", "hirka", "süveter", "suveter"] },
  { iconId: "pants", words: ["pantolon", "kot", "jean", "tayt"] },
  { iconId: "skirt", words: ["etek"] },
  { iconId: "dress", words: ["elbise", "abiye"] },
  { iconId: "quilt", words: ["yorgan"] },
  { iconId: "blanket", words: ["battaniye", "örtü", "ortu"] },
  { iconId: "curtain", words: ["perde", "stor", "tül", "tul"] },
  { iconId: "carpet", words: ["halı", "hali", "kilim"] },
  { iconId: "tablecloth", words: ["masa örtüsü", "masa ortusu", "tablecloth"] },
  { iconId: "sofa", words: ["koltuk", "kanape", "kanepe", "sedir"] },
  { iconId: "towel", words: ["havlu", "bornoz"] },
  { iconId: "bag", words: ["çanta", "canta", "valiz"] },
  { iconId: "leather", words: ["deri"] },
  { iconId: "tie", words: ["kravat", "papyon"] },
  { iconId: "shoe", words: ["ayakkabı", "ayakkabi", "bot"] },
  { iconId: "hat", words: ["şapka", "sapka", "bere"] },
];

export const PRODUCT_ICON_CATEGORIES = [
  "Üst Giyim",
  "Alt Giyim",
  "Ev Tekstili",
  "Özel",
] as const;

function normalizeIconId(iconName: string): string {
  const key = iconName?.toLowerCase().trim() ?? "";
  if (!key) return "shirt";
  return LEGACY_ICON_ALIASES[key] ?? key;
}

export function suggestIconFromProductName(name: string): string {
  const normalized = name.toLowerCase().trim();
  if (!normalized) return "shirt";

  for (const { iconId, words } of NAME_KEYWORDS) {
    if (words.some((w) => normalized.includes(w))) {
      return iconId;
    }
  }

  return "shirt";
}

export interface ResolvedProductVisual {
  iconId: string;
  label: string;
  category: ProductIconCategory;
  Icon: ProductIconComponent;
  theme: ProductVisualTheme;
}

export function resolveProductVisual(
  name: string,
  iconName: string,
): ResolvedProductVisual {
  const nameGuess = suggestIconFromProductName(name);
  const iconId =
    nameGuess !== "shirt" ? nameGuess : normalizeIconId(iconName);
  const option = ICON_MAP[iconId] ?? ICON_MAP.shirt;

  return {
    iconId,
    label: option.label,
    category: option.category,
    Icon: option.Icon,
    theme: option.theme,
  };
}

export function getProductIcon(iconName: string): ProductIconComponent {
  const iconId = normalizeIconId(iconName);
  return ICON_MAP[iconId]?.Icon ?? ICON_MAP.shirt.Icon;
}

export function getProductIconLabel(iconName: string): string {
  const iconId = normalizeIconId(iconName);
  return ICON_MAP[iconId]?.label ?? (iconName || "Genel");
}

export function getProductIconOption(iconName: string): ProductIconOption | undefined {
  const iconId = normalizeIconId(iconName);
  return ICON_MAP[iconId];
}

export function getProductTheme(iconName: string): ProductVisualTheme {
  const iconId = normalizeIconId(iconName);
  return ICON_MAP[iconId]?.theme ?? THEMES["Üst Giyim"];
}

/** @deprecated use product-icons — alias for compatibility */
export { getProductIcon as default };
