import type {
  Coupon,
  Customer,
  CustomerTag,
  Order,
  OrderItem,
  OrderPayment,
  OrganizationSettings,
  Product,
  ServicePrice,
  WhatsappTemplate,
  CreditLedgerEntry,
  AuditLogEntry,
} from "../schema/index";
import { prepareOrganizationSyncSlice } from "./organization-asset";

export function customerSyncPayload(customer: Customer): Record<string, unknown> {
  return { customer };
}

export function orderSyncPayload(
  order: Order,
  items: OrderItem[],
  payments: OrderPayment[] = []
): Record<string, unknown> {
  return { order, items, payments };
}

export function organizationSyncPayload(
  org: OrganizationSettings,
  previousLogoHash?: string | null
): Record<string, unknown> {
  const slice = prepareOrganizationSyncSlice(org, previousLogoHash);
  return {
    profile: slice.profile,
    logoAsset: slice.logoAsset ?? null,
  };
}

export function productSyncPayload(
  product: Product,
  servicePrices: ServicePrice[] = []
): Record<string, unknown> {
  return { product, servicePrices };
}

export function couponSyncPayload(coupon: Coupon): Record<string, unknown> {
  return { coupon };
}

export function customerTagSyncPayload(tag: CustomerTag): Record<string, unknown> {
  return { customerTag: tag };
}

export function servicePriceSyncPayload(
  servicePrice: ServicePrice,
  productGlobalId: string
): Record<string, unknown> {
  return { servicePrice, productGlobalId };
}

export function whatsappTemplateSyncPayload(
  template: WhatsappTemplate
): Record<string, unknown> {
  return { whatsappTemplate: template };
}

export function creditLedgerSyncPayload(
  entry: CreditLedgerEntry
): Record<string, unknown> {
  return { creditLedgerEntry: entry };
}

export function auditLogSyncPayload(
  entry: AuditLogEntry
): Record<string, unknown> {
  return { auditLogEntry: entry };
}
