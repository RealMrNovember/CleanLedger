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

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        licenseToneClasses[display.tone],
        compact ? "text-center" : "",
        className
      )}
    >
      <p className={cn("font-semibold", compact ? "text-[11px]" : "text-xs")}>
        {display.label}
      </p>
      {!compact && display.detail && (
        <p className="mt-0.5 text-[11px] opacity-80">{display.detail}</p>
      )}
    </div>
  );
}
