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
  bed: Bed,
  blanket: BedDouble,
  curtain: Blinds,
  sparkles: Sparkles,
  default: Package,
};

export function getProductIcon(iconName: string): LucideIcon {
  const key = iconName?.toLowerCase().trim() ?? "default";
  return ICON_MAP[key] ?? ICON_MAP.default;
}

export function getProductIconLabel(iconName: string): string {
  return iconName || "default";
}
