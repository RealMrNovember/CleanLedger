import {
  PRODUCT_ICON_CATEGORIES,
  PRODUCT_ICON_OPTIONS,
  resolveProductVisual,
} from "@/lib/product-icons";
import { cn } from "@/lib/utils";

interface IconGalleryPickerProps {
  value: string;
  onChange: (iconId: string) => void;
  previewName?: string;
}

export function IconGalleryPicker({
  value,
  onChange,
  previewName = "Örnek Ürün",
}: IconGalleryPickerProps) {
  const preview = resolveProductVisual(previewName, value);
  const PreviewIcon = preview.Icon;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center rounded-2xl border-2 border-mint/30 bg-gradient-to-b from-mint-light/40 to-white p-6 dark:from-slate-800 dark:to-slate-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Önizleme — POS&apos;ta böyle görünür
        </p>
        <div
          className={cn(
            "flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br shadow-lg ring-2 sm:size-28",
            preview.theme.gradient,
            preview.theme.ring,
            preview.theme.icon,
          )}
        >
          <PreviewIcon className="size-12 stroke-[1.5] sm:size-14" />
        </div>
        <p className="mt-4 text-lg font-bold">{previewName || preview.label}</p>
        <p className="text-sm text-muted-foreground">{preview.category}</p>
      </div>

      {PRODUCT_ICON_CATEGORIES.map((category) => {
        const items = PRODUCT_ICON_OPTIONS.filter((o) => o.category === category);
        return (
          <div key={category}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map(({ id, label, Icon, theme }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange(id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition",
                    value === id
                      ? "border-mint bg-mint-light text-[#0f3d3a] ring-2 ring-mint/30 dark:bg-slate-800 dark:text-mint"
                      : "border-border bg-background hover:border-mint/40 hover:bg-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
                      theme.gradient,
                      theme.ring,
                      theme.icon,
                    )}
                  >
                    <Icon className="size-6" />
                  </div>
                  <span className="text-center text-[11px] font-medium leading-tight">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
