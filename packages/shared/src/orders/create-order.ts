import type { OrderPriority, OrderStatus, PaymentMethod, PaymentMode, PaymentStatus } from "../schema/index";
import { derivePaymentStatus } from "../schema/index";

export interface CreateOrderItemInput {
  subtotal: number;
}

export interface CreateOrderFinancialInput {
  items: CreateOrderItemInput[];
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentMode?: PaymentMode;
  discountAmount?: number;
  orderStatus?: OrderStatus;
  priority?: OrderPriority;
  couponCode?: string | null;
}

export interface CreateOrderFinancials {
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  priority: OrderPriority;
  paymentMethod: PaymentMethod;
  couponCode: string | null;
}

export function computeCreateOrderFinancials(
  input: CreateOrderFinancialInput
): CreateOrderFinancials {
  const subtotalAmount = input.items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = Math.min(input.discountAmount ?? 0, subtotalAmount);
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);
  const paymentMode = input.paymentMode ?? input.paymentMethod;
  let amountPaid = Math.min(Math.max(0, input.amountPaid), totalAmount);
  if (paymentMode === "credit" || paymentMode === "pay_on_delivery") {
    amountPaid = 0;
  }
  const balanceDue = Math.max(0, totalAmount - amountPaid);
  const paymentStatus = derivePaymentStatus(amountPaid, totalAmount, paymentMode);

  return {
    subtotalAmount,
    discountAmount,
    totalAmount,
    paymentMode,
    amountPaid,
    balanceDue,
    paymentStatus,
    orderStatus: input.orderStatus ?? "preparing",
    priority: input.priority ?? "normal",
    paymentMethod: input.paymentMethod,
    couponCode: input.couponCode?.trim().toUpperCase() || null,
  };
}
