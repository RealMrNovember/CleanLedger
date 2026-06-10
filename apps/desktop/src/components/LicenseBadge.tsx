import { cn } from "@/lib/utils";
import {
  getLicenseDisplay,
  licenseToneClasses,
} from "@/lib/license-display";
import type { LicenseSnapshot } from "@/lib/license-client";

export function LicenseBadge({
  license,
  compact = false,
  className,
}: {
  license: LicenseSnapshot | null;
  compact?: boolean;
  className?: string;
}) {
  const display = getLicenseDisplay(license);
  const tooltip = display.detail
    ? `${display.label} — ${display.detail}`
    : display.label;

  return (
    <div
      title={tooltip}
      className={cn(
        "rounded-xl border px-3 py-2",
        licenseToneClasses[display.tone],
        compact ? "text-center" : "",
        className
      )}
    >
      <p className={cn("font-semibold", compact ? "text-[10px] leading-tight" : "text-xs")}>
        {display.label}
      </p>
      {display.detail && (
        <p
          className={cn(
            "opacity-80",
            compact ? "mt-0.5 text-[9px] leading-tight" : "mt-0.5 text-[11px]"
          )}
        >
          {display.detail}
        </p>
      )}
    </div>
  );
}
