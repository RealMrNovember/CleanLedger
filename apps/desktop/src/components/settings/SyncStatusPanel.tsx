import { RefreshCw, Cloud, CloudOff } from "lucide-react";
import { useSync } from "@/context/SyncContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Henüz senkron yok";
  try {
    return new Date(iso).toLocaleString("tr-TR");
  } catch {
    return iso;
  }
}

export function SyncStatusPanel() {
  const { syncing, lastSyncAt, pendingCount, syncNow } = useSync();
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <Card className="mx-auto max-w-xl bg-white dark:bg-slate-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          {online ? (
            <Cloud className="size-5 text-mint" />
          ) : (
            <CloudOff className="size-5 text-amber-500" />
          )}
          Bulut Senkronizasyonu
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Müşteri ve siparişler firma hesabınızla tüm cihazlarda paylaşılır.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Bağlantı</span>
            <span className="font-medium">{online ? "Çevrimiçi" : "Çevrimdışı"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Son başarılı sync</span>
            <span className="font-medium text-right">{formatSyncTime(lastSyncAt)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Bekleyen değişiklik</span>
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
          {syncing ? "Senkronize ediliyor…" : "Şimdi senkronize et"}
        </Button>
      </CardContent>
    </Card>
  );
}
