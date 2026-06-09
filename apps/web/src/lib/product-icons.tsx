import {
  Shirt,
  Briefcase,
  Layers,
  Sparkles,
  Bed,
  BedDouble,
  Blinds,
  Crown,
  Package,
  Ribbon,
  Wind,
  Gem,
  Footprints,
  HardHat,
  Grid2X2,
  Bath,
  ShoppingBag,
  Scissors,
  Watch,
  Sofa,
  type LucideIcon,
} from "lucide-react";

/** icon_name → Lucide ikon eşlemesi */
const ICON_MAP: Record<string, LucideIcon> = {
  shirt: Shirt,
  pants: Ribbon,
  jacket: Briefcase,
  skirt: Wind,
  dress: Gem,
  suit: Crown,
  coat: Layers,
  sweater: Shirt,
  tie: Scissors,
  scarf: Sparkles,
  bed: Bed,
  blanket: BedDouble,
  curtain: Blinds,
  carpet: Grid2X2,
  sofa: Sofa,
  towel: Bath,
  shoe: Footprints,
  hat: HardHat,
  bag: ShoppingBag,
  watch: Watch,
  sparkles: Sparkles,
  default: Package,
};

export interface ProductIconOption {
  id: string;
  label: string;
  Icon: LucideIcon;
}

export const PRODUCT_ICON_OPTIONS: ProductIconOption[] = [
  { id: "shirt", label: "Gömlek", Icon: Shirt },
  { id: "pants", label: "Pantolon", Icon: Ribbon },
  { id: "jacket", label: "Ceket", Icon: Briefcase },
  { id: "coat", label: "Palto", Icon: Layers },
  { id: "dress", label: "Elbise", Icon: Gem },
  { id: "skirt", label: "Etek", Icon: Wind },
  { id: "suit", label: "Takım", Icon: Crown },
  { id: "sweater", label: "Kazak", Icon: Shirt },
  { id: "tie", label: "Kravat", Icon: Scissors },
  { id: "scarf", label: "Eşarp", Icon: Sparkles },
  { id: "bed", label: "Nevresim", Icon: Bed },
  { id: "blanket", label: "Yorgan", Icon: BedDouble },
  { id: "curtain", label: "Perde", Icon: Blinds },
  { id: "carpet", label: "Halı", Icon: Grid2X2 },
  { id: "sofa", label: "Koltuk", Icon: Sofa },
  { id: "towel", label: "Havlu", Icon: Bath },
  { id: "shoe", label: "Ayakkabı", Icon: Footprints },
  { id: "hat", label: "Şapka", Icon: HardHat },
  { id: "bag", label: "Çanta", Icon: ShoppingBag },
  { id: "watch", label: "Saat", Icon: Watch },
  { id: "default", label: "Genel", Icon: Package },
];

export function getProductIcon(iconName: string): LucideIcon {
  const key = iconName?.toLowerCase().trim() ?? "default";
  return ICON_MAP[key] ?? ICON_MAP.default;
}

export function getProductIconLabel(iconName: string): string {
  const opt = PRODUCT_ICON_OPTIONS.find((o) => o.id === iconName);
  return opt?.label ?? (iconName || "Genel");
}
