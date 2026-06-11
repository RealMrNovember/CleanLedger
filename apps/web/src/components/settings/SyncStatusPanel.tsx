import { RefreshCw, Cloud, CloudOff } from "lucide-react";
import { useSync } from "@/context/SyncContext";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SyncStatusPanel() {
  const { t, locale } = useI18n();
  const { syncing, lastSyncAt, pendingCount, syncNow } = useSync();
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  const formatSyncTime = (iso: string | null): string => {
    if (!iso) return t("settings.syncNever");
    try {
      return new Date(iso).toLocaleString(locale);
    } catch {
      return iso;
    }
  };

  return (
    <Card className="mx-auto max-w-xl bg-white dark:bg-slate-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          {online ? (
            <Cloud className="size-5 text-mint" />
          ) : (
            <CloudOff className="size-5 text-amber-500" />
          )}
          {t("settings.syncTitle")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.syncHint")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t("settings.syncConnection")}</span>
            <span className="font-medium">
              {online ? t("settings.syncOnline") : t("settings.syncOffline")}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t("settings.syncLastSuccess")}</span>
            <span className="font-medium text-right">{formatSyncTime(lastSyncAt)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t("settings.syncPending")}</span>
            <span className="font-medium">{pendingCount}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={syncing || !online}
          onClick={() => void syncNow(true)}
        >
          <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? t("settings.syncSyncing") : t("settings.syncNow")}
        </Button>
      </CardContent>
    </Card>
  );
}
