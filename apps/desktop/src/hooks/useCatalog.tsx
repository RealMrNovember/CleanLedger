import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Product, ServicePrice } from "@/db/schema";
import { getProducts, getServicePrices, initDatabase } from "@/db/client";
import { SESSION_CLEARED_EVENT } from "@cleanledger/shared/tenant";
import { useAuth } from "@/context/AuthContext";

interface CatalogContextValue {
  products: Product[];
  servicePrices: ServicePrice[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { token, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await initDatabase();
      const [p, sp] = await Promise.all([getProducts(), getServicePrices()]);
      setProducts(p);
      setServicePrices(sp);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token || authLoading) {
      if (!token) {
        setProducts([]);
        setServicePrices([]);
      }
      setLoading(Boolean(token && authLoading));
      return;
    }
    void refresh();
  }, [refresh, token, authLoading]);

  useEffect(() => {
    const handler = () => void refresh();
    const onSessionCleared = () => {
      setProducts([]);
      setServicePrices([]);
      setLoading(false);
    };
    window.addEventListener("cleanledger-sync", handler);
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
    return () => {
      window.removeEventListener("cleanledger-sync", handler);
      window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
    };
  }, [refresh]);

  return (
    <CatalogContext.Provider
      value={{ products, servicePrices, loading, refresh }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
