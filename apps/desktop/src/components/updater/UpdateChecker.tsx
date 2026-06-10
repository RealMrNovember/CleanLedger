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
import { RELEASES_PAGE } from "@/lib/github-updater";
import { openReleasePage, useAppUpdate } from "@/hooks/useAppUpdate";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function UpdateChecker() {
  const [open, setOpen] = useState(false);
  const { currentVersion, release, checking, hasUpdate } = useAppUpdate(true);

  useEffect(() => {
    if (!checking && hasUpdate) {
      setOpen(true);
    }
  }, [checking, hasUpdate]);

  const handleDownload = () => {
    void openReleasePage(release?.releasePageUrl ?? RELEASES_PAGE);
  };

  if (!isTauri() || checking || !hasUpdate || !release) return null;

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
            Mevcut sürüm: <strong>{currentVersion}</strong>
            <br />
            Yeni sürüm: <strong>{release.version}</strong>
            <br />
            <span className="mt-2 inline-block text-sm">
              GitHub sürüm sayfasından kurulum dosyasını indirip kurabilirsiniz.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button size="lg" className="w-full gap-2" onClick={handleDownload}>
            <Download className="size-5" />
            Güncellemeyi İndir
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Daha Sonra
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
