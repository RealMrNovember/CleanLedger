import { Download, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RELEASES_PAGE } from "@/lib/github-updater";
import { openReleasePage, useAppUpdate } from "@/hooks/useAppUpdate";

export function UpdateSettingsPanel() {
  const { currentVersion, release, checking, error, hasUpdate, check } =
    useAppUpdate(true);

  const handleDownload = () => {
    void openReleasePage(release?.releasePageUrl ?? RELEASES_PAGE);
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-mint" />
          Güncelleme
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          GitHub üzerinden yeni sürüm kontrol edilir. Güncelleme varsa kurulum
          dosyasını indirip kurabilirsiniz.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-muted/40 p-4 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-muted-foreground">
            Mevcut sürüm
          </p>
          <p className="mt-1 text-lg font-bold">
            {currentVersion ? `v${currentVersion}` : "—"}
          </p>
        </div>

        {checking ? (
          <p className="text-sm text-muted-foreground">Kontrol ediliyor…</p>
        ) : hasUpdate ? (
          <div className="rounded-xl border border-mint/40 bg-mint-light/30 p-4 dark:bg-teal-950/30">
            <p className="font-semibold text-[#0f5f57] dark:text-teal-100">
              Yeni sürüm mevcut: v{release?.version}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              GitHub release sayfasından kurulum dosyasını indirin.
            </p>
            <Button className="mt-3 gap-2" onClick={handleDownload}>
              <Download className="size-4" />
              Güncellemeyi İndir
            </Button>
          </div>
        ) : (
          <p className="text-sm font-medium text-mint">
            Uygulamanız güncel.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={checking}
            onClick={() => void check()}
          >
            <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
            Yeniden Kontrol Et
          </Button>
          <Button variant="ghost" onClick={() => void openReleasePage(RELEASES_PAGE)}>
            Tüm Sürümler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
