import { PRODUCT_ICON_CATEGORIES, PRODUCT_ICON_OPTIONS } from "@/lib/product-icons";
import { cn } from "@/lib/utils";

interface IconGalleryPickerProps {
  value: string;
  onChange: (iconId: string) => void;
}

export function IconGalleryPicker({ value, onChange }: IconGalleryPickerProps) {
  const selected = PRODUCT_ICON_OPTIONS.find((o) => o.id === value);
  const SelectedIcon = selected?.Icon;

  return (
    <div className="space-y-4">
      {selected && SelectedIcon && (
        <div className="flex flex-col items-center rounded-2xl border-2 border-mint/40 bg-gradient-to-b from-mint-light/50 to-white p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Önizleme — POS&apos;ta böyle görünür
          </p>
          <div className="flex size-24 items-center justify-center rounded-3xl bg-mint text-white shadow-lg">
            <SelectedIcon className="size-14 stroke-[1.5]" />
          </div>
          <p className="mt-4 text-lg font-bold">{selected.label}</p>
          <p className="text-sm text-muted-foreground">{selected.category}</p>
        </div>
      )}

      {PRODUCT_ICON_CATEGORIES.map((category) => {
        const items = PRODUCT_ICON_OPTIONS.filter((o) => o.category === category);
        return (
          <div key={category}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange(id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition",
                    value === id
                      ? "border-mint bg-mint-light text-[#0f3d3a] ring-2 ring-mint/30"
                      : "border-border bg-background hover:border-mint/40 hover:bg-muted/30"
                  )}
                >
                  <Icon className="size-8" />
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
