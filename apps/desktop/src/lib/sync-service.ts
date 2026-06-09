import type { DatabaseSnapshot } from "@/db/client";
import { pullSync, pushSync } from "./sync-api";
import {
  exportDatabaseSnapshot,
  importDatabaseSnapshot,
} from "@/db/client";

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pulling = false;

export function scheduleSyncPush(): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void runSyncPush();
  }, 2000);
}

export async function runSyncPush(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  try {
    const snapshot = await exportDatabaseSnapshot();
    await pushSync(snapshot);
  } catch {
    /* offline veya auth yok */
  }
}

export async function runSyncPull(): Promise<boolean> {
  if (pulling) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  pulling = true;
  try {
    const remote = await pullSync();
    if (!remote) return false;
    const local = await exportDatabaseSnapshot();
    if (
      !local.data.products.length &&
      !local.data.orders.length &&
      (remote.data as unknown as DatabaseSnapshot["data"]).products?.length
    ) {
      await importDatabaseSnapshot(remote as unknown as DatabaseSnapshot);
      return true;
    }
    if (remote.updatedAt > local.updatedAt) {
      await importDatabaseSnapshot(remote as unknown as DatabaseSnapshot);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("[CleanLedger] Sync pull içe aktarma atlandı:", err);
    return false;
  } finally {
    pulling = false;
  }
}

export function initSyncListeners(onRemoteChange?: () => void): () => void {
  const handleOnline = () => {
    void runSyncPull().then((changed) => {
      if (changed) onRemoteChange?.();
      void runSyncPush();
    });
  };

  window.addEventListener("online", handleOnline);

  const interval = window.setInterval(() => {
    if (!navigator.onLine) return;
    void runSyncPull().then((changed) => {
      if (changed) onRemoteChange?.();
    });
  }, 60_000);

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(interval);
  };
}
