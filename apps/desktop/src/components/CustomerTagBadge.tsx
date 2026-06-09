import type { CustomerTag, TagColor } from "@/db/schema";
import { TAG_COLOR_CLASSES } from "@/db/schema";
import { cn } from "@/lib/utils";

interface CustomerTagBadgeProps {
  tag: CustomerTag | null | undefined;
  className?: string;
}

export function CustomerTagBadge({ tag, className }: CustomerTagBadgeProps) {
  if (!tag || tag.slug === "normal") return null;
  return (
    <span
      className={cn(
        "rounded-lg px-2 py-0.5 text-xs font-semibold",
        TAG_COLOR_CLASSES[tag.color as TagColor] ?? TAG_COLOR_CLASSES.slate,
        className
      )}
    >
      {tag.label}
    </span>
  );
}
