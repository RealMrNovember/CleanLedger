import {
  Shirt,
  BriefcaseBusiness,
  BedDouble,
  Square,
  LayoutGrid,
  Lamp,
  Ribbon,
  ShoppingBag,
  Package,
  type LucideIcon,
} from "lucide-react";

/** Ürün ikon eşlemesi — kuru temizleme odaklı set */
const ICON_MAP: Record<string, LucideIcon> = {
  shirt: Shirt,
  tshirt: Shirt,
  jacket: BriefcaseBusiness,
  coat: BriefcaseBusiness,
  pants: Ribbon,
  skirt: LayoutGrid,
  blanket: BedDouble,
  tablecloth: Square,
  carpet: Square,
  lamp: Lamp,
  bag: ShoppingBag,
  leather: BriefcaseBusiness,
  default: Package,
  // legacy
  jacket_old: BriefcaseBusiness,
  pants_old: Ribbon,
  coat_old: BriefcaseBusiness,
  dress: LayoutGrid,
  skirt_old: LayoutGrid,
  bed: BedDouble,
  curtain: Lamp,
  sofa: Square,
  towel: Square,
  shoe: ShoppingBag,
  hat: BriefcaseBusiness,
  bag_old: ShoppingBag,
  watch: Package,
  sparkles: Lamp,
  suit: BriefcaseBusiness,
  sweater: Shirt,
  tie: Ribbon,
  scarf: Lamp,
  blanket_old: BedDouble,
  carpet_old: Square,
  layers: BriefcaseBusiness,
  layers2: BriefcaseBusiness,
};

export interface ProductIconOption {
  id: string;
  label: string;
  category: string;
  Icon: LucideIcon;
}

export const PRODUCT_ICON_OPTIONS: ProductIconOption[] = [
  { id: "shirt", label: "Gömlek", category: "Üst Giyim", Icon: Shirt },
  { id: "jacket", label: "Ceket", category: "Üst Giyim", Icon: BriefcaseBusiness },
  { id: "tshirt", label: "Tişört", category: "Üst Giyim", Icon: Shirt },
  { id: "pants", label: "Pantolon", category: "Alt Giyim", Icon: Ribbon },
  { id: "skirt", label: "Etek", category: "Alt Giyim", Icon: LayoutGrid },
  { id: "blanket", label: "Yorgan", category: "Ev Tekstili", Icon: BedDouble },
  { id: "carpet", label: "Halı", category: "Ev Tekstili", Icon: Square },
  { id: "tablecloth", label: "Masa Örtüsü", category: "Ev Tekstili", Icon: Square },
  { id: "lamp", label: "Abajur / Perde", category: "Özel", Icon: Lamp },
  { id: "bag", label: "Çanta", category: "Özel", Icon: ShoppingBag },
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

/** @deprecated use product-icons — alias for compatibility */
export { getProductIcon as default };
