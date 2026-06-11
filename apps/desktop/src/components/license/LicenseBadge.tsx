import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { licenseToneClasses } from "@/lib/license-display";
import {
  formatLocalizedLicenseDetail,
  getLocalizedLicenseDisplay,
} from "@cleanledger/shared/i18n/license-i18n";

interface LicenseBadgeProps {
  collapsed?: boolean;
}

export function LicenseBadge({ collapsed }: LicenseBadgeProps) {
  const { license, loading } = useAuth();
  const { t, locale } = useI18n();
  const display =
    loading && !license
      ? {
          label: t("license.checkingBadge"),
          detail: undefined,
          tone: "inactive" as const,
        }
      : getLocalizedLicenseDisplay(t, locale, license);
  const detail =
    license && !loading
      ? formatLocalizedLicenseDetail(t, locale, license)
      : display.detail;
  const tooltip = detail ? `${display.label} — ${detail}` : display.label;

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
          {detail && (
            <p className="truncate text-[10px] opacity-80">{detail}</p>
          )}
        </div>
      )}
    </div>
  );
}
