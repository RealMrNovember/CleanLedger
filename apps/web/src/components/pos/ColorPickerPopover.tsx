import { useEffect, useRef, useState } from "react";
import type { ProductColorPreset } from "@cleanledger/shared";
import { resolveColorDisplay } from "@cleanledger/shared";
import { cn } from "@/lib/utils";

interface ColorPickerPopoverProps {
  value: string | null | undefined;
  palette: ProductColorPreset[];
  onChange: (hex: string | null) => void;
  className?: string;
}

export function ColorDot({
  hex,
  label,
  size = "md",
  className,
}: {
  hex: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const isLight = hex.toLowerCase() === "#f5f5f5" || hex.toLowerCase() === "#ffffff";
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full border shadow-sm",
        size === "sm" ? "size-3" : "size-4",
        isLight ? "border-border/80" : "border-black/10",
        className
      )}
      style={{ backgroundColor: hex }}
      title={label}
      aria-hidden={!label}
    />
  );
}

export function ColorPickerPopover({
  value,
  palette,
  onChange,
  className,
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = resolveColorDisplay(palette, value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition",
          selected
            ? "border-border/60 bg-muted/30"
            : "border-dashed border-border/60 text-muted-foreground hover:border-mint/40 hover:text-foreground"
        )}
        aria-label={selected ? `Renk: ${selected.label}` : "Renk seç"}
        aria-expanded={open}
      >
        {selected ? (
          <>
            <ColorDot hex={selected.hex} label={selected.label} size="sm" />
            <span className="max-w-[4.5rem] truncate">{selected.label}</span>
          </>
        ) : (
          <>
            <span className="inline-block size-3 rounded-full border border-dashed border-muted-foreground/50" />
            <span>Renk</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-slate-900">
          <div className="grid grid-cols-5 gap-1.5">
            {palette.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                title={preset.label}
                onClick={() => {
                  onChange(preset.hex);
                  setOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg p-1 transition hover:bg-muted/60",
                  value === preset.hex && "ring-2 ring-mint ring-offset-1"
                )}
              >
                <ColorDot hex={preset.hex} label={preset.label} />
                <span className="w-full truncate text-center text-[9px] font-medium text-muted-foreground">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <button
              type="button"
              className="mt-2 w-full rounded-lg py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Renk kaldır
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ColorBadgeRow({
  colors,
  className,
}: {
  colors: Array<{ label: string; hex: string }>;
  className?: string;
}) {
  if (!colors.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {colors.map((c) => (
        <span
          key={c.hex}
          className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          title={c.label}
        >
          <ColorDot hex={c.hex} size="sm" />
          {c.label}
        </span>
      ))}
    </div>
  );
}
