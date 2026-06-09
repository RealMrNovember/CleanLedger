import {
  Shirt,
  Scissors,
  Layers,
  Sparkles,
  Bed,
  Wind,
  Crown,
  Package,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  shirt: Shirt,
  pants: Scissors,
  jacket: Layers,
  skirt: Wind,
  dress: Sparkles,
  suit: Crown,
  coat: Layers,
  sweater: Shirt,
  bed: Bed,
  blanket: Bed,
  curtain: Wind,
  sparkles: Sparkles,
  default: Package,
};

export function getProductIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? ICON_MAP.default;
}
