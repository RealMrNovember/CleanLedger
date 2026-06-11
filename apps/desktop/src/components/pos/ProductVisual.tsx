import { cn } from "@/lib/utils";
import { resolveProductVisual } from "@/lib/product-icons";

const SIZE = {
  xs: {
    wrap: "size-8 rounded-lg ring-1",
    icon: "size-4 stroke-[1.75]",
  },
  sm: {
    wrap: "size-10 rounded-xl ring-1 sm:size-11",
    icon: "size-5 stroke-[1.75] sm:size-[22px]",
  },
  md: {
    wrap: "size-12 rounded-xl ring-2 sm:size-14 sm:rounded-2xl",
    icon: "size-6 stroke-[1.75] sm:size-7 md:size-8",
  },
  lg: {
    wrap: "size-20 rounded-2xl ring-2 sm:size-24 sm:rounded-3xl",
    icon: "size-10 stroke-[1.5] sm:size-12",
  },
} as const;

interface ProductVisualProps {
  name: string;
  iconName: string;
  size?: keyof typeof SIZE;
  className?: string;
  interactive?: boolean;
}

export function ProductVisual({
  name,
  iconName,
  size = "md",
  className,
  interactive = false,
}: ProductVisualProps) {
  const { Icon, theme } = resolveProductVisual(name, iconName);
  const s = SIZE[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center bg-gradient-to-br shadow-sm",
        s.wrap,
        theme.gradient,
        theme.ring,
        theme.shadow,
        interactive &&
          "transition-all duration-200 group-hover:scale-105 group-hover:shadow-md group-active:scale-95",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-[inherit] bg-white/20 dark:bg-white/5" />
      <Icon className={cn("relative z-[1]", theme.icon, s.icon)} />
    </div>
  );
}
