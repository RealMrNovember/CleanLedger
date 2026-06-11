import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OrderPriority } from "@/db/schema";
import type { CartLine } from "@/components/pos/CartPanel";
import { toDateKey, addDaysToDate } from "@/lib/dates";
import { useAuth } from "@/context/AuthContext";

export interface PosDraftState {
  phone: string;
  firstName: string;
  lastName: string;
  isRegistered: boolean;
  deliveryDate: string;
  priority: OrderPriority;
  cart: CartLine[];
  couponCode: string;
  appliedCouponCode: string | null;
  discountAmount: number;
  couponMessage: string;
}

function createEmptyDraft(): PosDraftState {
  return {
    phone: "",
    firstName: "",
    lastName: "",
    isRegistered: false,
    deliveryDate: toDateKey(addDaysToDate(new Date(), 3)),
    priority: "normal",
    cart: [],
    couponCode: "",
    appliedCouponCode: null,
    discountAmount: 0,
    couponMessage: "",
  };
}

type CartUpdater = CartLine[] | ((prev: CartLine[]) => CartLine[]);

interface PosDraftContextValue extends PosDraftState {
  setPhone: (phone: string) => void;
  setFirstName: (firstName: string) => void;
  setLastName: (lastName: string) => void;
  setIsRegistered: (isRegistered: boolean) => void;
  setDeliveryDate: (deliveryDate: string) => void;
  setPriority: (priority: OrderPriority) => void;
  setCart: (updater: CartUpdater) => void;
  setCouponCode: (couponCode: string) => void;
  setAppliedCouponCode: (code: string | null) => void;
  setDiscountAmount: (amount: number) => void;
  setCouponMessage: (message: string) => void;
  clearDraft: () => void;
  hasDraft: boolean;
}

const PosDraftContext = createContext<PosDraftContextValue | null>(null);

export function PosDraftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<PosDraftState>(createEmptyDraft);

  const patch = useCallback((partial: Partial<PosDraftState>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const setCart = useCallback((updater: CartUpdater) => {
    setDraft((prev) => ({
      ...prev,
      cart: typeof updater === "function" ? updater(prev.cart) : updater,
    }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraft(createEmptyDraft());
  }, []);

  useEffect(() => {
    if (!user) clearDraft();
  }, [user, clearDraft]);

  const hasDraft =
    draft.cart.length > 0 ||
    draft.phone.trim().length > 0 ||
    draft.firstName.trim().length > 0 ||
    draft.lastName.trim().length > 0 ||
    Boolean(draft.appliedCouponCode);

  const value = useMemo<PosDraftContextValue>(
    () => ({
      ...draft,
      setPhone: (phone) => patch({ phone }),
      setFirstName: (firstName) => patch({ firstName }),
      setLastName: (lastName) => patch({ lastName }),
      setIsRegistered: (isRegistered) => patch({ isRegistered }),
      setDeliveryDate: (deliveryDate) => patch({ deliveryDate }),
      setPriority: (priority) => patch({ priority }),
      setCart,
      setCouponCode: (couponCode) => patch({ couponCode }),
      setAppliedCouponCode: (appliedCouponCode) => patch({ appliedCouponCode }),
      setDiscountAmount: (discountAmount) => patch({ discountAmount }),
      setCouponMessage: (couponMessage) => patch({ couponMessage }),
      clearDraft,
      hasDraft,
    }),
    [draft, patch, setCart, clearDraft, hasDraft]
  );

  return (
    <PosDraftContext.Provider value={value}>{children}</PosDraftContext.Provider>
  );
}

export function usePosDraft(): PosDraftContextValue {
  const ctx = useContext(PosDraftContext);
  if (!ctx) {
    throw new Error("usePosDraft must be used within PosDraftProvider");
  }
  return ctx;
}
