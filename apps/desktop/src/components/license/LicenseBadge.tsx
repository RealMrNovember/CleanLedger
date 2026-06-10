import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLicenseStatus } from "@/hooks/useLicenseStatus";
import { isLifetimeLicense } from "@/lib/license-display";

interface LicenseBadgeProps {
  email: string | undefined;
  collapsed?: boolean;
}

export function LicenseBadge({ email, collapsed }: LicenseBadgeProps) {
  const { license, loading, label } = useLicenseStatus(email);

  const lifetime = license ? isLifetimeLicense(license) : false;
  const trial =
    license?.status === "trial" || license?.type?.toLowerCase() === "trial";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-xs",
        lifetime
          ? "bg-mint-light/60 text-[#0f5f57] dark:bg-teal-950/50 dark:text-teal-100"
          : trial
            ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            : "bg-trust-light/50 text-trust"
      )}
      title={loading ? "Lisans kontrol ediliyor" : label}
    >
      <ShieldCheck className="size-4 shrink-0" />
      {!collapsed && (
        <span className="min-w-0 truncate font-medium">{label}</span>
      )}
    </div>
  );
}
