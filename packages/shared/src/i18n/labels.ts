import type {
  ItemStatus,
  OrderPriority,
  OrderStatus,
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
  ServiceType,
} from "../schema/index";
import type { OrderDeliveryFilter } from "../orders/search";

export type TranslateFn = (
  key: string,
  params?: Record<string, string>
) => string;

export function buildSchemaLabels(t: TranslateFn) {
  const e = (key: string) => t(`enums.${key}`);

  return {
    paymentStatus: {
      paid: e("paymentStatus.paid"),
      partial: e("paymentStatus.partial"),
      unpaid: e("paymentStatus.unpaid"),
      awaiting_delivery: e("paymentStatus.awaiting_delivery"),
    } satisfies Record<PaymentStatus, string>,
    paymentMethod: {
      cash: e("paymentMethod.cash"),
      card: e("paymentMethod.card"),
    } satisfies Record<PaymentMethod, string>,
    paymentMode: {
      cash: e("paymentMode.cash"),
      card: e("paymentMode.card"),
      credit: e("paymentMode.credit"),
      pay_on_delivery: e("paymentMode.pay_on_delivery"),
    } satisfies Record<PaymentMode, string>,
    orderStatus: {
      preparing: e("orderStatus.preparing"),
      ready: e("orderStatus.ready"),
      delivered: e("orderStatus.delivered"),
    } satisfies Record<OrderStatus, string>,
    orderPriority: {
      normal: e("orderPriority.normal"),
      urgent: e("orderPriority.urgent"),
    } satisfies Record<OrderPriority, string>,
    itemStatus: {
      received: e("itemStatus.received"),
      preparing: e("itemStatus.preparing"),
      processing: e("itemStatus.processing"),
      qc: e("itemStatus.qc"),
      ready: e("itemStatus.ready"),
      delivered: e("itemStatus.delivered"),
      cancelled: e("itemStatus.cancelled"),
    } satisfies Record<ItemStatus, string>,
    service: {
      dry_clean: e("service.dry_clean"),
      iron: e("service.iron"),
      wash: e("service.wash"),
      stain_removal: e("service.stain_removal"),
    } satisfies Record<ServiceType, string>,
    deliveryFilter: {
      all: e("deliveryFilter.all"),
      active: e("deliveryFilter.active"),
      delivered: e("deliveryFilter.delivered"),
    } satisfies Record<OrderDeliveryFilter, string>,
    creditLedger: {
      order_debit: e("creditLedger.order_debit"),
      payment_credit: e("creditLedger.payment_credit"),
      reset: e("creditLedger.reset"),
      reset_undo: e("creditLedger.reset_undo"),
      adjustment: e("creditLedger.adjustment"),
    },
    customerTag: {
      normal: e("tag.normal"),
      titiz: e("tag.titiz"),
      vip: e("tag.vip"),
      problematic: e("tag.problematic"),
    },
  };
}

export type SchemaLabels = ReturnType<typeof buildSchemaLabels>;
