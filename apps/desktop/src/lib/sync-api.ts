export interface DatabaseSnapshotPayload {
  version: 1;
  updatedAt: string;
  data: Record<string, unknown>;
}

import { appConfig } from "@/lib/config";

const SYNC_API_URL = appConfig.syncApiUrl;

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

export async function pullSync(): Promise<DatabaseSnapshotPayload | null> {
  const token = readToken();
  if (!token) return null;

  const res = await fetch(
    `${SYNC_API_URL}?action=pull&token=${encodeURIComponent(token)}`,
    { headers: { Accept: "application/json" } }
  );
  const json = (await res.json()) as {
    success: boolean;
    payload?: Record<string, unknown> | null;
    updatedAt?: string | null;
  };
  if (!res.ok || !json.success || !json.payload) return null;
  return {
    version: 1,
    updatedAt: json.updatedAt ?? new Date().toISOString(),
    data: json.payload as DatabaseSnapshotPayload["data"],
  };
}

export async function pushSync(snapshot: {
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

  if (res.status === 409) {
    const conflict = (await res.json()) as {
      payload?: Record<string, unknown>;
      serverUpdatedAt?: string;
    };
    if (conflict.payload && conflict.serverUpdatedAt) {
      return false;
    }
  }

  return res.ok;
}

export { readToken as getSyncAuthToken };
