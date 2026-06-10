import type { DatabaseSnapshot } from "@/db/client";
import { pullSync, pushSync } from "./sync-api";
import {
  exportDatabaseSnapshot,
  importDatabaseSnapshot,
} from "@/db/client";
import {
  bumpSyncUpdatedAt,
  getSyncUpdatedAt,
  setSyncUpdatedAt,
} from "./sync-meta";

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pulling = false;

type SnapshotData = DatabaseSnapshot["data"];

function hasUserBusinessData(data: SnapshotData): boolean {
  return (
    (data.customers?.length ?? 0) > 0 || (data.orders?.length ?? 0) > 0
  );
}

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
    if (!hasUserBusinessData(snapshot.data)) {
      const remote = await pullSync();
      if (
        remote &&
        hasUserBusinessData(remote.data as unknown as SnapshotData)
      ) {
        return;
      }
    }
    bumpSyncUpdatedAt();
    const payload = await exportDatabaseSnapshot();
    const ok = await pushSync(payload);
    if (ok && payload.updatedAt) {
      setSyncUpdatedAt(payload.updatedAt);
    }
  } catch (err) {
    console.warn("[CleanLedger] Sync push atlandı:", err);
  }
}

export async function runSyncPull(): Promise<boolean> {
  if (pulling) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  pulling = true;
  try {
    const remote = await pullSync();
    if (!remote) return false;

    const remoteData = remote.data as unknown as SnapshotData;
    const local = await exportDatabaseSnapshot();
    const localSyncAt = getSyncUpdatedAt();
    const remoteHasData = hasUserBusinessData(remoteData);
    const localHasData = hasUserBusinessData(local.data);

    const shouldImport =
      (remoteHasData && !localHasData) ||
      Boolean(
        remote.updatedAt &&
          (!localSyncAt || remote.updatedAt > localSyncAt)
      );

    if (!shouldImport) return false;

    await importDatabaseSnapshot(remote as unknown as DatabaseSnapshot);
    setSyncUpdatedAt(remote.updatedAt);
    return true;
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

export { bumpSyncUpdatedAt } from "./sync-meta";
