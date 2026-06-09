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
  const [version, setVersion] = useState("");
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    void (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          setVersion(update.version);
          setOpen(true);
        }
      } catch (err) {
        console.debug("Updater check skipped:", err);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-mint-light">
            <Sparkles className="size-7 text-mint" />
          </div>
          <DialogTitle className="text-center text-xl">
            Yeni Sürüm Mevcut
          </DialogTitle>
          <DialogDescription className="text-center">
            CleanLedger {version} hazır. Tek tıkla yükleyin — kurulum arka planda
            sessizce tamamlanır ve uygulama yeniden başlar.
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
