import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  initSyncListeners,
  runSyncPull,
  runSyncPush,
} from "@/lib/sync-service";
import { getPendingSyncCount } from "@/db/client";
import { getSyncUpdatedAt } from "@/lib/sync-meta";

interface SyncContextValue {
  syncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  syncNow: (forcePull?: boolean) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const syncNow = useCallback(
    async (forcePull = false) => {
      if (!token) return;
      setSyncing(true);
      try {
        if (forcePull) await runSyncPull();
        await runSyncPush(true);
        setLastSyncAt(getSyncUpdatedAt() ?? new Date().toISOString());
        setPendingCount(await getPendingSyncCount());
      } catch {
        /* offline */
      } finally {
        setSyncing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) {
      setSyncing(false);
      setLastSyncAt(null);
      setPendingCount(0);
      return;
    }
    void syncNow(true);
    const refreshPending = () => {
      void getPendingSyncCount().then(setPendingCount);
    };
    refreshPending();
    window.addEventListener("cleanledger-sync", refreshPending);
    const cleanup = initSyncListeners(() => {
      void syncNow(true);
      refreshPending();
    });
    return () => {
      cleanup();
      window.removeEventListener("cleanledger-sync", refreshPending);
    };
  }, [token, syncNow]);

  return (
    <SyncContext.Provider value={{ syncing, lastSyncAt, pendingCount, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return ctx;
}
