import { useEffect, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function UpdateChecker() {
  const [open, setOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("");
  const [newVersion, setNewVersion] = useState("");
  const [installing, setInstalling] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    void (async () => {
      try {
        const { getVersion } = await import("@tauri-apps/api/app");
        const current = await getVersion();
        setCurrentVersion(current);

        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          setNewVersion(update.version);
          setOpen(true);
        }
      } catch (err) {
        console.debug("Updater check skipped:", err);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  const handleInstall = async () => {
    if (!isTauri()) return;
    setInstalling(true);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      }
    } catch (err) {
      console.error(err);
      alert("Güncelleme yüklenemedi. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setInstalling(false);
    }
  };

  if (!isTauri() || !checked) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-mint-light">
            <Sparkles className="size-7 text-mint" />
          </div>
          <DialogTitle className="text-center text-xl">
            Yeni Güncelleme Mevcut
          </DialogTitle>
          <DialogDescription className="text-center">
            {currentVersion && newVersion ? (
              <>
                Mevcut sürüm: <strong>{currentVersion}</strong>
                <br />
                Yeni sürüm: <strong>{newVersion}</strong>
                <br />
                <span className="mt-2 inline-block">
                  Tek tıkla yükleyin — kurulum tamamlandığında uygulama yeniden
                  başlar.
                </span>
              </>
            ) : (
              <>CleanLedger güncellemesi hazır. Tek tıkla yükleyebilirsiniz.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <Button
          size="lg"
          className="w-full gap-2"
          disabled={installing}
          onClick={() => void handleInstall()}
        >
          <Download className="size-5" />
          {installing ? "Yükleniyor..." : "Yükle ve Yeniden Başlat"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
