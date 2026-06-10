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
import { exportDatabaseSnapshot } from "@/db/client";
import { getSyncUpdatedAt } from "@/lib/sync-meta";

interface SyncContextValue {
  syncing: boolean;
  lastSyncAt: string | null;
  syncNow: (forcePull?: boolean) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

async function localHasBusinessData(): Promise<boolean> {
  const snap = await exportDatabaseSnapshot();
  return (
    snap.data.customers.length > 0 || snap.data.orders.length > 0
  );
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const syncNow = useCallback(
    async (forcePull = false) => {
      if (!token) return;
      setSyncing(true);
      try {
        if (forcePull) {
          const pulled = await runSyncPull();
          if (pulled) {
            window.dispatchEvent(new Event("cleanledger-sync"));
          }
        }
        if (await localHasBusinessData()) {
          await runSyncPush();
        }
        setLastSyncAt(getSyncUpdatedAt() ?? new Date().toISOString());
      } catch (err) {
        console.warn("[CleanLedger] Senkronizasyon atlandı:", err);
      } finally {
        setSyncing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    void syncNow(true);
    return initSyncListeners(() => {
      void syncNow(true);
    });
  }, [token, syncNow]);

  return (
    <SyncContext.Provider value={{ syncing, lastSyncAt, syncNow }}>
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
