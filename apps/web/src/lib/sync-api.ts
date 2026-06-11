import type {
  DatabaseSnapshotPayload,
  SyncPullResponse,
  SyncPushRequest,
} from "@cleanledger/shared/sync";

export type { DatabaseSnapshotPayload };

const SYNC_API_URL =
  import.meta.env.VITE_SYNC_API_URL ??
  (import.meta.env.PROD
    ? "https://cleanledger.cicibyte.com/api/sync.php"
    : "/api/sync.php");

const SYNC_PROTOCOL = "org";

function normalizePullResponse(
  json: SyncPullResponse & {
    payload?: Record<string, unknown> | null;
    updatedAt?: string | null;
    snapshot?: Record<string, unknown> | null;
  }
): SyncPullResponse | null {
  const rawSnapshot = json.snapshot as
    | {
        schemaVersion?: number;
        version?: number;
        updatedAt?: string;
        data?: Record<string, unknown>;
      }
    | null
    | undefined;

  if (rawSnapshot?.data) {
    return {
      success: true,
      organizationId: json.organizationId,
      serverUpdatedAt: json.serverUpdatedAt,
      changes: json.changes ?? [],
      snapshot: {
        version: (rawSnapshot.version ??
          rawSnapshot.schemaVersion ??
          3) as DatabaseSnapshotPayload["version"],
        updatedAt: rawSnapshot.updatedAt ?? json.serverUpdatedAt ?? new Date().toISOString(),
        data: rawSnapshot.data,
      },
    };
  }

  if (json.changes?.length) {
    return {
      success: true,
      organizationId: json.organizationId,
      serverUpdatedAt: json.serverUpdatedAt,
      changes: json.changes,
    };
  }

  return null;
}

function readToken(): string | null {
  for (const key of ["cleanledger_session", "cleanledger_desktop_session"]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const session = JSON.parse(raw) as { token?: string };
      if (session.token) return session.token;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function pullSyncChanges(
  since: string | null
): Promise<SyncPullResponse | null> {
  const token = readToken();
  if (!token) return null;

  const params = new URLSearchParams({
    action: "changes",
    protocol: SYNC_PROTOCOL,
    token,
  });
  if (since) params.set("since", since);

  const res = await fetch(`${SYNC_API_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const json = (await res.json()) as SyncPullResponse;
  if (!res.ok || !json.success) return null;

  return {
    success: true,
    organizationId: json.organizationId,
    serverUpdatedAt: json.serverUpdatedAt,
    changes: json.changes ?? [],
  };
}

export async function pullSyncOrg(
  since: string | null,
  bootstrap = false
): Promise<SyncPullResponse | null> {
  const token = readToken();
  if (!token) return null;

  const params = new URLSearchParams({
    action: "pull",
    protocol: SYNC_PROTOCOL,
    token,
  });
  if (since) params.set("since", since);
  if (bootstrap) params.set("bootstrap", "1");

  const res = await fetch(`${SYNC_API_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const json = (await res.json()) as SyncPullResponse & {
    payload?: Record<string, unknown> | null;
    updatedAt?: string | null;
    snapshot?: Record<string, unknown> | null;
  };
  if (!res.ok || !json.success) return null;

  const normalized = normalizePullResponse(json);
  if (normalized) return normalized;
  if (json.payload) {
    return {
      success: true,
      snapshot: {
        version: 3,
        updatedAt: json.updatedAt ?? new Date().toISOString(),
        data: json.payload,
      },
      serverUpdatedAt: json.updatedAt ?? undefined,
    };
  }
  return null;
}

export async function pushSyncOrg(
  request: SyncPushRequest
): Promise<
  | { ok: true; serverUpdatedAt: string }
  | { ok: false; conflict?: SyncPullResponse }
> {
  const token = readToken();
  if (!token) return { ok: false };

  const res = await fetch(
    `${SYNC_API_URL}?action=push&protocol=${SYNC_PROTOCOL}&token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        token,
        protocol: SYNC_PROTOCOL,
        ...request,
      }),
    }
  );

  const json = (await res.json()) as SyncPullResponse & {
    success: boolean;
    serverUpdatedAt?: string;
    updatedAt?: string;
  };

  if (res.status === 409) {
    return {
      ok: false,
      conflict: {
        success: false,
        changes: json.changes,
        snapshot: json.snapshot,
        serverUpdatedAt: json.serverUpdatedAt,
      },
    };
  }

  if (!res.ok || !json.success) return { ok: false };

  return {
    ok: true,
    serverUpdatedAt: json.serverUpdatedAt ?? json.updatedAt ?? request.updatedAt,
  };
}

/** Geçiş dönemi — tam snapshot push */
export async function pushSyncLegacy(snapshot: {
  data: unknown;
  updatedAt: string;
}): Promise<boolean> {
  const token = readToken();
  if (!token) return false;

  const res = await fetch(`${SYNC_API_URL}?action=push&token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      token,
      payload: snapshot.data,
      updatedAt: snapshot.updatedAt,
    }),
  });
  return res.ok;
}

export { readToken as getSyncAuthToken };
