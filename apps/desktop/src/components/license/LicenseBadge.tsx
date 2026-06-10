import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  getLicenseDisplay,
  licenseToneClasses,
} from "@/lib/license-display";

interface LicenseBadgeProps {
  collapsed?: boolean;
}

export function LicenseBadge({ collapsed }: LicenseBadgeProps) {
  const { license, loading } = useAuth();
  const display = loading && !license
    ? { label: "Lisans: Kontrol ediliyor…", tone: "inactive" as const }
    : getLicenseDisplay(license);
  const tooltip = display.detail
    ? `${display.label} — ${display.detail}`
    : display.label;

  return (
    <div
      title={tooltip}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2",
        licenseToneClasses[display.tone],
        collapsed ? "justify-center" : ""
      )}
    >
      <ShieldCheck className="size-4 shrink-0" />
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{display.label}</p>
          {display.detail && (
            <p className="truncate text-[10px] opacity-80">{display.detail}</p>
          )}
        </div>
      )}
    </div>
  );
}
