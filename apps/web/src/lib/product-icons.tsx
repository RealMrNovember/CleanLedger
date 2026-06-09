import {
  Shirt,
  Layers,
  Layers2,
  Briefcase,
  BriefcaseBusiness,
  BedDouble,
  Square,
  LayoutGrid,
  Lamp,
  Ribbon,
  Triangle,
  Package,
  type LucideIcon,
} from "lucide-react";

/** Kuru temizleme sektörü — 12 özel kategori ikonu (+ legacy eşleme) */
const ICON_MAP: Record<string, LucideIcon> = {
  shirt: Shirt,
  coat: Layers,
  jacket: Layers2,
  tshirt: Shirt,
  pants: Ribbon,
  skirt: Triangle,
  blanket: BedDouble,
  tablecloth: Square,
  carpet: LayoutGrid,
  lamp: Lamp,
  bag: Briefcase,
  leather: BriefcaseBusiness,
  default: Package,
  // legacy ürünler
  jacket_old: Briefcase,
  pants_old: Ribbon,
  coat_old: Layers,
  dress: Triangle,
  skirt_old: Triangle,
  bed: BedDouble,
  curtain: Lamp,
  sofa: Square,
  towel: Square,
  shoe: Briefcase,
  hat: Briefcase,
  bag_old: Briefcase,
  watch: Briefcase,
  sparkles: Lamp,
  suit: Layers,
  sweater: Shirt,
  tie: Ribbon,
  scarf: Lamp,
  blanket_old: BedDouble,
  carpet_old: LayoutGrid,
};

export interface ProductIconOption {
  id: string;
  label: string;
  category: string;
  Icon: LucideIcon;
}

/** Sadece kuru temizlemeye uygun 12 ikon */
export const PRODUCT_ICON_OPTIONS: ProductIconOption[] = [
  { id: "shirt", label: "Gömlek", category: "Üst Giyim", Icon: Shirt },
  { id: "coat", label: "Palto", category: "Üst Giyim", Icon: Layers },
  { id: "jacket", label: "Ceket", category: "Üst Giyim", Icon: Layers2 },
  { id: "tshirt", label: "Tişört", category: "Üst Giyim", Icon: Shirt },
  { id: "pants", label: "Pantolon", category: "Alt Giyim", Icon: Ribbon },
  { id: "skirt", label: "Etek", category: "Alt Giyim", Icon: Triangle },
  { id: "blanket", label: "Yorgan", category: "Ev Tekstili", Icon: BedDouble },
  { id: "tablecloth", label: "Masa Örtüsü", category: "Ev Tekstili", Icon: Square },
  { id: "carpet", label: "Halı", category: "Ev Tekstili", Icon: LayoutGrid },
  { id: "lamp", label: "Abajur / Perde", category: "Özel", Icon: Lamp },
  { id: "bag", label: "Çanta", category: "Özel", Icon: Briefcase },
  { id: "leather", label: "Deri Ürün", category: "Özel", Icon: BriefcaseBusiness },
];

export const PRODUCT_ICON_CATEGORIES = [
  "Üst Giyim",
  "Alt Giyim",
  "Ev Tekstili",
  "Özel",
] as const;

export function getProductIcon(iconName: string): LucideIcon {
  const key = iconName?.toLowerCase().trim() ?? "default";
  return ICON_MAP[key] ?? ICON_MAP.default;
}

export function getProductIconLabel(iconName: string): string {
  const opt = PRODUCT_ICON_OPTIONS.find((o) => o.id === iconName);
  return opt?.label ?? (iconName || "Genel");
}

export function getProductIconOption(iconName: string): ProductIconOption | undefined {
  return PRODUCT_ICON_OPTIONS.find((o) => o.id === iconName);
}
