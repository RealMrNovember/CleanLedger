import { useCallback, useEffect, useState } from "react";
import {
  findNewerGitHubRelease,
  type RemoteRelease,
} from "@/lib/github-updater";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function useAppUpdate(autoCheck = true) {
  const [currentVersion, setCurrentVersion] = useState("");
  const [release, setRelease] = useState<RemoteRelease | null>(null);
  const [checking, setChecking] = useState(autoCheck);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    if (!isTauri()) {
      setChecking(false);
      return;
    }

    setChecking(true);
    setError("");
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      const current = await getVersion();
      setCurrentVersion(current);
      const newer = await findNewerGitHubRelease(current);
      setRelease(newer);
    } catch (err) {
      setRelease(null);
      setError(
        err instanceof Error ? err.message : "Güncelleme kontrol edilemedi."
      );
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (autoCheck) {
      void check();
    }
  }, [autoCheck, check]);

  return {
    currentVersion,
    release,
    checking,
    error,
    hasUpdate: Boolean(release),
    check,
  };
}

export async function openReleasePage(url: string): Promise<void> {
  if (isTauri()) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    } catch {
      /* fallback */
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
