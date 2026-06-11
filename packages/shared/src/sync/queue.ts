import type { LocalDb } from "../schema/local-db";
import type { SyncQueueRow } from "../schema/index";
import { createGlobalId } from "../ids/global-id";
import type { SyncEntityType, SyncOperation, SyncQueueEntry } from "./types";

export interface EnqueueSyncInput {
  organizationId: string;
  entityType: SyncEntityType;
  entityGlobalId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  clientUpdatedAt?: string;
}

function rowToEntry(row: SyncQueueRow): SyncQueueEntry {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(row.payload || "{}") as Record<string, unknown>;
  } catch {
    payload = {};
  }
  return {
    id: row.id,
    organizationId: row.organizationId,
    entityType: row.entityType as SyncEntityType,
    entityGlobalId: row.entityGlobalId,
    operation: row.operation as SyncOperation,
    payload,
    clientUpdatedAt: row.clientUpdatedAt,
    syncedAt: row.syncedAt,
  };
}

function entryToRow(entry: SyncQueueEntry): SyncQueueRow {
  return {
    id: entry.id,
    organizationId: entry.organizationId,
    entityType: entry.entityType,
    entityGlobalId: entry.entityGlobalId,
    operation: entry.operation,
    payload: JSON.stringify(entry.payload),
    clientUpdatedAt: entry.clientUpdatedAt,
    syncedAt: entry.syncedAt,
  };
}

/** Aynı entity için bekleyen kayıt varsa günceller (dedup). */
export function upsertSyncQueueEntry(
  db: LocalDb,
  input: EnqueueSyncInput
): LocalDb {
  const clientUpdatedAt = input.clientUpdatedAt ?? new Date().toISOString();
  const entry: SyncQueueEntry = {
    id: createGlobalId(),
    organizationId: input.organizationId,
    entityType: input.entityType,
    entityGlobalId: input.entityGlobalId,
    operation: input.operation,
    payload: input.payload,
    clientUpdatedAt,
    syncedAt: null,
  };

  const pending = db.syncQueue.filter((row) => !row.syncedAt);
  const rest = db.syncQueue.filter((row) => row.syncedAt);
  const idx = pending.findIndex(
    (row) =>
      row.entityType === input.entityType &&
      row.entityGlobalId === input.entityGlobalId
  );

  const nextPendingRows: SyncQueueRow[] =
    idx >= 0
      ? pending.map((row, i) =>
          i === idx
            ? entryToRow({
                ...entry,
                id: row.id,
              })
            : row
        )
      : [...pending, entryToRow(entry)];

  return {
    ...db,
    syncQueue: [...rest, ...nextPendingRows],
  };
}

export function getPendingSyncQueue(db: LocalDb): SyncQueueEntry[] {
  return db.syncQueue.filter((row) => !row.syncedAt).map(rowToEntry);
}

export function markSyncQueueSynced(
  db: LocalDb,
  entryIds: string[],
  syncedAt: string = new Date().toISOString()
): LocalDb {
  const idSet = new Set(entryIds);
  return {
    ...db,
    syncQueue: db.syncQueue.map((row) =>
      idSet.has(row.id) ? { ...row, syncedAt } : row
    ),
  };
}

export function pendingSyncCount(db: LocalDb): number {
  return getPendingSyncQueue(db).length;
}
