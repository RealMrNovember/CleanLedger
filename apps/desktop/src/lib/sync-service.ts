import type { DatabaseSnapshot } from "@/db/client";
import { pullSyncOrg, pushSyncOrg, pushSyncLegacy } from "./sync-api";
import {
  exportDatabaseSnapshot,
  importDatabaseSnapshot,
  getPendingSyncChanges,
  markSyncChangesSynced,
  applyRemoteSyncChanges,
  getOrganizationId,
  ensureDatabaseMigrated,
  waitForDatabaseBoot,
  isDatabaseBootReady,
} from "@/db/client";
import {
  bumpSyncUpdatedAt,
  getSyncUpdatedAt,
  setSyncUpdatedAt,
} from "./sync-meta";

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pulling = false;

function syncDebug(...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  console.log("[DB DEBUG] SyncService", ...args);
  const message = `SyncService ${args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ")}`;
  void import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke("debug_log", { message }))
    .catch(() => {
      /* terminal köprüsü yoksa yalnızca webview konsolu */
    });
}

type SnapshotData = DatabaseSnapshot["data"];

function hasUserBusinessData(data: SnapshotData): boolean {
  return (data.customers?.length ?? 0) > 0 || (data.orders?.length ?? 0) > 0;
}

export function scheduleSyncPush(): void {
  if (!isDatabaseBootReady()) {
    syncDebug("scheduleSyncPush — boot kilidi kapalı, erteleniyor");
    void waitForDatabaseBoot().then(() => scheduleSyncPush());
    return;
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void runSyncPush();
  }, 2000);
}

export async function runSyncPush(_immediate = false): Promise<void> {
  syncDebug("runSyncPush başlatılıyor — boot kilidi bekleniyor", {
    immediate: _immediate,
  });
  await waitForDatabaseBoot();
  syncDebug("runSyncPush — boot kilidi açıldı, migration kontrolü");
  await ensureDatabaseMigrated();
  syncDebug("runSyncPush — migration tamam, push başlıyor");
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }

  try {
    const organizationId = getOrganizationId();
    const pending = await getPendingSyncChanges();
    const snapshot = await exportDatabaseSnapshot();

    if (!organizationId) {
      if (hasUserBusinessData(snapshot.data)) {
        const ok = await pushSyncLegacy({
          data: snapshot.data,
          updatedAt: bumpSyncUpdatedAt(),
        });
        if (ok) setSyncUpdatedAt(snapshot.updatedAt);
      }
      return;
    }

    const request = {
      organizationId,
      updatedAt: bumpSyncUpdatedAt(),
      changes: pending,
      fullSnapshot:
        pending.length === 0 && hasUserBusinessData(snapshot.data)
          ? ({
              version: snapshot.version,
              updatedAt: snapshot.updatedAt,
              data: snapshot.data as unknown as Record<string, unknown>,
            })
          : undefined,
    };

    const result = await pushSyncOrg(request);
    if (result.ok) {
      await markSyncChangesSynced(pending.map((c) => c.id));
      setSyncUpdatedAt(result.serverUpdatedAt);
      return;
    }

    if (!result.ok && result.conflict) {
      await resolveSyncConflict(result.conflict);
    }
  } catch (err) {
    console.warn("[CleanLedger] Sync push atlandı:", err);
  }
}

async function resolveSyncConflict(conflict: {
  changes?: import("@cleanledger/shared/sync").SyncQueueEntry[];
  snapshot?: import("@cleanledger/shared/sync").DatabaseSnapshotPayload;
  serverUpdatedAt?: string;
}): Promise<void> {
  await waitForDatabaseBoot();
  await ensureDatabaseMigrated();
  if (conflict.changes?.length) {
    await applyRemoteSyncChanges(conflict.changes);
  }
  if (conflict.snapshot?.data) {
    await importDatabaseSnapshot(conflict.snapshot as unknown as DatabaseSnapshot);
  }
  if (conflict.serverUpdatedAt) {
    setSyncUpdatedAt(conflict.serverUpdatedAt);
  }
  window.dispatchEvent(new Event("cleanledger-sync"));
  await runSyncPush(true);
}

export async function runSyncPull(bootstrap = false): Promise<boolean> {
  syncDebug("runSyncPull başlatılıyor — boot kilidi bekleniyor", {
    bootstrap,
  });
  await waitForDatabaseBoot();
  syncDebug("runSyncPull — boot kilidi açıldı, migration kontrolü");
  await ensureDatabaseMigrated();
  syncDebug("runSyncPull — migration tamam, pull başlıyor");
  if (pulling) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  pulling = true;
  try {
    const since = getSyncUpdatedAt();
    const remote = await pullSyncOrg(since, bootstrap);
    if (!remote) return false;

    const localOrg = getOrganizationId();
    if (
      remote.organizationId &&
      localOrg &&
      remote.organizationId.trim().toLowerCase() !== localOrg.trim().toLowerCase()
    ) {
      console.error("[CleanLedger] Sync pull reddedildi: organizationId uyuşmazlığı.");
      return false;
    }

    let changed = false;

    if (remote.changes?.length) {
      syncDebug("runSyncPull — applyRemoteSyncChanges", {
        changeCount: remote.changes.length,
      });
      await applyRemoteSyncChanges(remote.changes);
      changed = true;
    }

    const local = await exportDatabaseSnapshot();
    const remoteData = remote.snapshot?.data as SnapshotData | undefined;
    const shouldImportSnapshot =
      remote.snapshot &&
      remoteData &&
      (!hasUserBusinessData(local.data) ||
        Boolean(
          remote.serverUpdatedAt &&
            (!since || remote.serverUpdatedAt > since)
        ));

    if (shouldImportSnapshot && remote.snapshot) {
      syncDebug("runSyncPull — importDatabaseSnapshot");
      await importDatabaseSnapshot(remote.snapshot as unknown as DatabaseSnapshot);
      changed = true;
    }

    if (remote.serverUpdatedAt) {
      setSyncUpdatedAt(remote.serverUpdatedAt);
    }

    if (changed) {
      window.dispatchEvent(new Event("cleanledger-sync"));
    }
    return changed;
  } catch (err) {
    console.warn("[CleanLedger] Sync pull içe aktarma atlandı:", err);
    return false;
  } finally {
    pulling = false;
  }
}

export function initSyncListeners(onRemoteChange?: () => void): () => void {
  const handleOnline = () => {
    void waitForDatabaseBoot().then(() =>
      runSyncPull().then((changed) => {
        if (changed) onRemoteChange?.();
        void runSyncPush(true);
      })
    );
  };

  const handleVisible = () => {
    if (document.visibilityState !== "visible") return;
    if (!navigator.onLine) return;
    void waitForDatabaseBoot().then(() =>
      runSyncPull().then((changed) => {
        if (changed) onRemoteChange?.();
      })
    );
  };

  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisible);

  const interval = window.setInterval(() => {
    if (!navigator.onLine) return;
    void waitForDatabaseBoot().then(() =>
      runSyncPull().then((changed) => {
        if (changed) onRemoteChange?.();
      })
    );
  }, 15_000);

  return () => {
    window.removeEventListener("online", handleOnline);
    document.removeEventListener("visibilitychange", handleVisible);
    clearInterval(interval);
  };
}

export { bumpSyncUpdatedAt } from "./sync-meta";
