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

interface CatalogContextValue {
  products: Product[];
  servicePrices: ServicePrice[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
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
    void refresh();
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
