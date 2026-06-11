import { useState } from "react";
import { KeyRound, MonitorSmartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LicenseSnapshot } from "@cleanledger/shared/license";
import {
  formatLocalizedLicenseDeviceLabel,
  formatLocalizedLicenseDeviceSummary,
} from "@cleanledger/shared/i18n/license-i18n";
import { getDeviceName, setDeviceName } from "@/lib/license-device";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";

interface LicenseManagementCardProps {
  license: LicenseSnapshot | null;
  loading?: boolean;
  onActivateKey: (licenseKey: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function LicenseManagementCard({
  license,
  loading = false,
  onActivateKey,
  onRefresh,
}: LicenseManagementCardProps) {
  const { t } = useI18n();
  const [licenseKey, setLicenseKey] = useState("");
  const [deviceName, setDeviceNameState] = useState(getDeviceName());
  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const key = licenseKey.trim();
    if (!key) {
      setError(t("license.keyRequired"));
      return;
    }
    setActivating(true);
    try {
      setDeviceName(deviceName);
      await onActivateKey(key);
      setLicenseKey("");
      setSuccess(t("license.keyApplied"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("license.activateFailed")
      );
    } finally {
      setActivating(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setDeviceName(deviceName);
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const devices = license?.devices ?? [];

  return (
    <CardSection title={t("license.devicesTitle")} icon={MonitorSmartphone}>
      <p className="text-sm text-muted-foreground">
        {loading
          ? t("license.loadingInfo")
          : formatLocalizedLicenseDeviceSummary(t, license) ||
            t("license.sharedHint")}
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium">
          {t("license.deviceNameLabel")}
        </label>
        <Input
          value={deviceName}
          onChange={(e) => setDeviceNameState(e.target.value)}
          onBlur={() => setDeviceName(deviceName)}
          placeholder={t("license.deviceNamePlaceholder")}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("license.deviceNameHint")}
        </p>
      </div>

      {devices.length > 0 && (
        <ul className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
          {devices.map((device) => (
            <li
              key={device.hwid}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
                device.isCurrent
                  ? "bg-mint-light/40 dark:bg-teal-950/30"
                  : "bg-background/80"
              )}
            >
              <span className="font-medium">
                {formatLocalizedLicenseDeviceLabel(t, device)}
                {device.isCurrent ? ` · ${t("license.thisDevice")}` : ""}
              </span>
              {device.isBlocked && (
                <span className="text-xs text-destructive">{t("license.blocked")}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void handleActivate(e)} className="space-y-3">
        <div>
          <label className="mb-1 flex items-center gap-2 text-sm font-medium">
            <KeyRound className="size-4 text-trust" />
            {t("license.licenseKey")}
          </label>
          <Input
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="CL-XXXX-XXXX-XXXX"
            autoComplete="off"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm font-medium text-mint">{success}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={activating || loading}>
            {activating ? t("license.applying") : t("license.applyKey")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={refreshing || loading}
            onClick={() => void handleRefresh()}
            className="gap-2"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            {t("license.refresh")}
          </Button>
        </div>
      </form>
    </CardSection>
  );
}

function CardSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof MonitorSmartphone;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
      <p className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-trust" />
        {title}
      </p>
      {children}
    </div>
  );
}
