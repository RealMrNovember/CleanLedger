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

interface SyncContextValue {
  syncing: boolean;
  lastSyncAt: string | null;
  syncNow: (forcePull?: boolean) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const syncNow = useCallback(
    async (forcePull = false) => {
      if (!token) return;
      setSyncing(true);
      try {
        if (forcePull) await runSyncPull();
        await runSyncPush();
        setLastSyncAt(new Date().toISOString());
      } catch {
        /* offline */
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
