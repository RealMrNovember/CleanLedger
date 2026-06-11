import type { DatabaseSnapshot } from "@/db/client";
import { pullSyncOrg, pushSyncOrg, pushSyncLegacy } from "./sync-api";
import {
  exportDatabaseSnapshot,
  importDatabaseSnapshot,
  getPendingSyncChanges,
  markSyncChangesSynced,
  applyRemoteSyncChanges,
  getOrganizationId,
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
  return (data.customers?.length ?? 0) > 0 || (data.orders?.length ?? 0) > 0;
}

export function scheduleSyncPush(): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void runSyncPush();
  }, 2000);
}

export async function runSyncPush(_immediate = false): Promise<void> {
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
  } catch {
    /* offline veya auth yok */
  }
}

async function resolveSyncConflict(conflict: {
  changes?: import("@cleanledger/shared/sync").SyncQueueEntry[];
  snapshot?: import("@cleanledger/shared/sync").DatabaseSnapshotPayload;
  serverUpdatedAt?: string;
}): Promise<void> {
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
      await applyRemoteSyncChanges(remote.changes);
      changed = true;
    }

    const local = await exportDatabaseSnapshot();
    const remoteData = remote.snapshot?.data as SnapshotData | undefined;
    const localEmpty = !hasUserBusinessData(local.data);
    const remoteHasData = Boolean(
      remoteData && hasUserBusinessData(remoteData)
    );
    const shouldImportSnapshot =
      remote.snapshot &&
      remoteData &&
      remoteHasData &&
      (bootstrap ||
        localEmpty ||
        Boolean(
          remote.serverUpdatedAt &&
            since &&
            remote.serverUpdatedAt > since
        ));

    if (shouldImportSnapshot && remote.snapshot) {
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
  } finally {
    pulling = false;
  }
}

export function initSyncListeners(onRemoteChange?: () => void): () => void {
  const handleOnline = () => {
    void runSyncPull().then((changed) => {
      if (changed) onRemoteChange?.();
      void runSyncPush(true);
    });
  };

  const handleVisible = () => {
    if (document.visibilityState !== "visible") return;
    if (!navigator.onLine) return;
    void runSyncPull().then((changed) => {
      if (changed) onRemoteChange?.();
    });
  };

  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisible);

  const interval = window.setInterval(() => {
    if (!navigator.onLine) return;
    void runSyncPull().then((changed) => {
      if (changed) onRemoteChange?.();
    });
  }, 15_000);

  return () => {
    window.removeEventListener("online", handleOnline);
    document.removeEventListener("visibilitychange", handleVisible);
    clearInterval(interval);
  };
}

export { getSyncUpdatedAt, setSyncUpdatedAt } from "./sync-meta";
