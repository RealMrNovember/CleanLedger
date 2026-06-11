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
import type { LocalDb } from "../schema/local-db";
import { createGlobalId } from "../ids/global-id";
import { withLogoHash } from "./organization-asset";
import type { SyncQueueEntry } from "./types";
import {
  remapItemNumbersForOrder,
  resolveOrderNumberConflict,
} from "../numbering/order-sequence";

function isNewer(incoming: string, existing: string | undefined): boolean {
  if (!existing) return true;
  return incoming >= existing;
}

function findCustomerByGlobalId(db: LocalDb, globalId: string): Customer | undefined {
  return db.customers.find((c) => c.globalId === globalId);
}

function findOrderByGlobalId(db: LocalDb, globalId: string): Order | undefined {
  return db.orders.find((o) => o.globalId === globalId);
}

function findProductByGlobalId(db: LocalDb, globalId: string): Product | undefined {
  return db.products.find((p) => p.globalId === globalId);
}

function findCouponByGlobalId(db: LocalDb, globalId: string): Coupon | undefined {
  return db.coupons.find((c) => c.globalId === globalId);
}

function findCustomerTagByGlobalId(
  db: LocalDb,
  globalId: string
): CustomerTag | undefined {
  return db.customerTags.find((t) => t.globalId === globalId);
}

function orgIdForChange(
  db: LocalDb,
  change: SyncQueueEntry
): string | null {
  return change.organizationId ?? db.organizationProfile?.organizationId ?? null;
}

function mergeCustomer(db: LocalDb, change: SyncQueueEntry): LocalDb {
  if (change.operation === "delete") {
    return {
      ...db,
      customers: db.customers.filter((c) => c.globalId !== change.entityGlobalId),
    };
  }

  const payload = change.payload as { customer?: Customer };
  const incoming = payload.customer;
  if (!incoming?.globalId) return db;

  const existing = findCustomerByGlobalId(db, incoming.globalId);
  if (!existing) {
    const id = db.nextCustomerId;
    const customer: Customer = {
      ...incoming,
      id,
      organizationId: incoming.organizationId ?? change.organizationId,
    };
    return {
      ...db,
      customers: [...db.customers, customer],
      nextCustomerId: id + 1,
    };
  }

  if (!isNewer(change.clientUpdatedAt, existing.updatedAt)) return db;

  return {
    ...db,
    customers: db.customers.map((c) =>
      c.globalId === incoming.globalId
        ? {
            ...c,
            ...incoming,
            id: c.id,
          }
        : c
    ),
  };
}

function remapOrderChildren(
  db: LocalDb,
  orderId: number,
  items: OrderItem[],
  payments: OrderPayment[]
): LocalDb {
  const withoutOld = {
    ...db,
    orderItems: db.orderItems.filter((i) => i.orderId !== orderId),
    orderPayments: db.orderPayments.filter((p) => p.orderId !== orderId),
  };

  let nextItemId = withoutOld.nextOrderItemId;
  const mappedItems = items.map((item) => ({
    ...item,
    id: item.id > 0 ? item.id : nextItemId++,
    orderId,
    organizationId: item.organizationId ?? withoutOld.organizationProfile?.organizationId ?? null,
  }));

  let nextPaymentId = withoutOld.nextOrderPaymentId;
  const mappedPayments = payments.map((payment) => ({
    ...payment,
    id: payment.id > 0 ? payment.id : nextPaymentId++,
    orderId,
    organizationId:
      payment.organizationId ?? withoutOld.organizationProfile?.organizationId ?? null,
  }));

  return {
    ...withoutOld,
    orderItems: [...withoutOld.orderItems, ...mappedItems],
    orderPayments: [...withoutOld.orderPayments, ...mappedPayments],
    nextOrderItemId: Math.max(nextItemId, withoutOld.nextOrderItemId),
    nextOrderPaymentId: Math.max(nextPaymentId, withoutOld.nextOrderPaymentId),
  };
}

function applyOrderNumberResolutions(
  db: LocalDb,
  incoming: Order,
  preferIncoming: boolean
): { db: LocalDb; order: Order } {
  const resolution = resolveOrderNumberConflict(db.orders, incoming, preferIncoming);
  let next = db;

  for (const reassignment of resolution.reassignments) {
    const target = next.orders.find((o) => o.globalId === reassignment.globalId);
    if (!target) continue;
    const itemUpdates = remapItemNumbersForOrder(
      reassignment.orderNumber,
      next.orderItems,
      target.id
    );
    next = {
      ...next,
      orders: next.orders.map((o) =>
        o.globalId === reassignment.globalId
          ? { ...o, orderNumber: reassignment.orderNumber }
          : o
      ),
      orderItems: next.orderItems.map((item) => {
        const updated = itemUpdates.find((u) => u.id === item.id);
        return updated ? { ...item, itemNumber: updated.itemNumber } : item;
      }),
    };
  }

  const normalizedOrder = { ...incoming, orderNumber: resolution.orderNumber };
  const existing = incoming.globalId
    ? findOrderByGlobalId(next, incoming.globalId)
    : undefined;
  if (existing && existing.orderNumber !== normalizedOrder.orderNumber) {
    const itemUpdates = remapItemNumbersForOrder(
      normalizedOrder.orderNumber,
      next.orderItems,
      existing.id
    );
    next = {
      ...next,
      orderItems: next.orderItems.map((item) => {
        const updated = itemUpdates.find((u) => u.id === item.id);
        return updated ? { ...item, itemNumber: updated.itemNumber } : item;
      }),
    };
  }

  return { db: next, order: normalizedOrder };
}

function mergeOrder(db: LocalDb, change: SyncQueueEntry): LocalDb {
  if (change.operation === "delete") {
    const order = findOrderByGlobalId(db, change.entityGlobalId);
    if (!order) return db;
    return {
      ...db,
      orders: db.orders.filter((o) => o.globalId !== change.entityGlobalId),
      orderItems: db.orderItems.filter((i) => i.orderId !== order.id),
      orderPayments: db.orderPayments.filter((p) => p.orderId !== order.id),
    };
  }

  const payload = change.payload as {
    order?: Order;
    items?: OrderItem[];
    payments?: OrderPayment[];
  };
  const incoming = payload.order;
  if (!incoming?.globalId) return db;

  const items = payload.items ?? [];
  const payments = payload.payments ?? [];
  const existing = findOrderByGlobalId(db, incoming.globalId);

  if (!existing) {
    const orderId = db.nextOrderId;
    const { db: withNumbers, order: normalized } = applyOrderNumberResolutions(
      db,
      {
        ...incoming,
        id: orderId,
        organizationId: incoming.organizationId ?? change.organizationId,
      },
      true
    );
    const order: Order = {
      ...normalized,
      id: orderId,
      organizationId: incoming.organizationId ?? change.organizationId,
    };
    const withOrder = {
      ...withNumbers,
      orders: [...withNumbers.orders, order],
      nextOrderId: orderId + 1,
      nextOrderNumber: Math.max(withNumbers.nextOrderNumber, orderId + 1),
    };
    return remapOrderChildren(withOrder, orderId, items, payments);
  }

  if (!isNewer(change.clientUpdatedAt, existing.createdAt)) return db;

  const { db: withNumbers, order: normalized } = applyOrderNumberResolutions(
    db,
    { ...incoming, id: existing.id },
    true
  );
  const mergedOrder: Order = {
    ...existing,
    ...normalized,
    id: existing.id,
  };
  const withOrder = {
    ...withNumbers,
    orders: withNumbers.orders.map((o) =>
      o.globalId === incoming.globalId ? mergedOrder : o
    ),
  };
  return remapOrderChildren(withOrder, existing.id, items, payments);
}

function mergeProductServicePrices(
  db: LocalDb,
  productId: number,
  incomingPrices: ServicePrice[],
  organizationId: string | null
): LocalDb {
  let next = db;
  for (const incoming of incomingPrices) {
    if (!incoming.globalId) continue;
    const existing = next.servicePrices.find(
      (sp) =>
        sp.globalId === incoming.globalId ||
        (sp.productId === productId && sp.serviceType === incoming.serviceType)
    );
    if (!existing) {
      const id = next.nextServicePriceId;
      next = {
        ...next,
        servicePrices: [
          ...next.servicePrices,
          {
            ...incoming,
            id,
            productId,
            organizationId: incoming.organizationId ?? organizationId,
          },
        ],
        nextServicePriceId: id + 1,
      };
      continue;
    }
    next = {
      ...next,
      servicePrices: next.servicePrices.map((sp) =>
        sp.id === existing.id
          ? {
              ...sp,
              ...incoming,
              id: sp.id,
              productId,
              globalId: incoming.globalId,
              organizationId: incoming.organizationId ?? organizationId,
            }
          : sp
      ),
    };
  }
  return next;
}

function mergeProduct(db: LocalDb, change: SyncQueueEntry): LocalDb {
  if (change.operation === "delete") {
    const product = findProductByGlobalId(db, change.entityGlobalId);
    if (!product) return db;
    return {
      ...db,
      products: db.products.filter((p) => p.globalId !== change.entityGlobalId),
      servicePrices: db.servicePrices.filter((sp) => sp.productId !== product.id),
    };
  }

  const payload = change.payload as {
    product?: Product;
    servicePrices?: ServicePrice[];
  };
  const incoming = payload.product;
  if (!incoming?.globalId) return db;

  const prices = payload.servicePrices ?? [];
  const organizationId = orgIdForChange(db, change);
  const existing = findProductByGlobalId(db, incoming.globalId);

  if (!existing) {
    const productId = db.nextProductId;
    const product: Product = {
      ...incoming,
      id: productId,
      organizationId: incoming.organizationId ?? organizationId,
    };
    const withProduct = {
      ...db,
      products: [...db.products, product],
      nextProductId: productId + 1,
    };
    return mergeProductServicePrices(withProduct, productId, prices, organizationId);
  }

  const merged: Product = {
    ...existing,
    ...incoming,
    id: existing.id,
  };
  const withProduct = {
    ...db,
    products: db.products.map((p) =>
      p.globalId === incoming.globalId ? merged : p
    ),
  };
  return mergeProductServicePrices(withProduct, existing.id, prices, organizationId);
}

function mergeCoupon(db: LocalDb, change: SyncQueueEntry): LocalDb {
  if (change.operation === "delete") {
    return {
      ...db,
      coupons: db.coupons.filter((c) => c.globalId !== change.entityGlobalId),
    };
  }

  const payload = change.payload as { coupon?: Coupon };
  const incoming = payload.coupon;
  if (!incoming?.globalId) return db;

  const organizationId = orgIdForChange(db, change);
  const existing = findCouponByGlobalId(db, incoming.globalId);

  if (!existing) {
    const id = db.nextCouponId;
    const coupon: Coupon = {
      ...incoming,
      id,
      organizationId: incoming.organizationId ?? organizationId,
    };
    return {
      ...db,
      coupons: [...db.coupons, coupon],
      nextCouponId: id + 1,
    };
  }

  if (!isNewer(change.clientUpdatedAt, existing.createdAt)) return db;

  return {
    ...db,
    coupons: db.coupons.map((c) =>
      c.globalId === incoming.globalId
        ? {
            ...c,
            ...incoming,
            id: c.id,
          }
        : c
    ),
  };
}

function mergeCustomerTag(db: LocalDb, change: SyncQueueEntry): LocalDb {
  if (change.operation === "delete") {
    const tag = findCustomerTagByGlobalId(db, change.entityGlobalId);
    if (!tag) return db;
    return {
      ...db,
      customerTags: db.customerTags.filter(
        (t) => t.globalId !== change.entityGlobalId
      ),
      customers: db.customers.map((c) =>
        c.tagId === tag.id ? { ...c, tagId: 1 } : c
      ),
    };
  }

  const payload = change.payload as { customerTag?: CustomerTag };
  const incoming = payload.customerTag;
  if (!incoming?.globalId) return db;

  const organizationId = orgIdForChange(db, change);
  const existing = findCustomerTagByGlobalId(db, incoming.globalId);

  if (!existing) {
    const id = db.nextCustomerTagId;
    const tag: CustomerTag = {
      ...incoming,
      id,
      organizationId: incoming.organizationId ?? organizationId,
    };
    return {
      ...db,
      customerTags: [...db.customerTags, tag],
      nextCustomerTagId: id + 1,
    };
  }

  return {
    ...db,
    customerTags: db.customerTags.map((t) =>
      t.globalId === incoming.globalId
        ? {
            ...t,
            ...incoming,
            id: t.id,
          }
        : t
    ),
  };
}

function mergeServicePrice(db: LocalDb, change: SyncQueueEntry): LocalDb {
  if (change.operation === "delete") {
    return {
      ...db,
      servicePrices: db.servicePrices.filter(
        (sp) => sp.globalId !== change.entityGlobalId
      ),
    };
  }

  const payload = change.payload as {
    servicePrice?: ServicePrice;
    productGlobalId?: string;
  };
  const incoming = payload.servicePrice;
  const productGlobalId = payload.productGlobalId;
  if (!incoming?.globalId || !productGlobalId) return db;

  const product = findProductByGlobalId(db, productGlobalId);
  if (!product) return db;

  return mergeProductServicePrices(
    db,
    product.id,
    [incoming],
    orgIdForChange(db, change)
  );
}

function mergeOrganization(db: LocalDb, change: SyncQueueEntry): LocalDb {
  const payload = change.payload as {
    profile?: OrganizationSettings;
    logoAsset?: { logoHash: string; logoDataUrl: string } | null;
  };
  const profile = payload.profile;
  if (!profile) return db;

  let org = withLogoHash(profile);
  if (payload.logoAsset?.logoDataUrl) {
    org = withLogoHash(org, payload.logoAsset.logoDataUrl);
  }

  return {
    ...db,
    organizationProfile: org,
  };
}

function findWhatsappTemplateByGlobalId(
  db: LocalDb,
  globalId: string
): WhatsappTemplate | undefined {
  return db.whatsappTemplates.find((t) => t.globalId === globalId);
}

function mergeWhatsappTemplate(db: LocalDb, change: SyncQueueEntry): LocalDb {
  const payload = change.payload as { whatsappTemplate?: WhatsappTemplate };
  const incoming = payload.whatsappTemplate;
  if (!incoming?.globalId) return db;

  const existing = findWhatsappTemplateByGlobalId(db, incoming.globalId);
  if (!existing) {
    const id = db.nextWhatsappTemplateId;
    const template: WhatsappTemplate = {
      ...incoming,
      id,
      organizationId: incoming.organizationId ?? change.organizationId,
    };
    return {
      ...db,
      whatsappTemplates: [...db.whatsappTemplates, template],
      nextWhatsappTemplateId: id + 1,
    };
  }

  if (!isNewer(change.clientUpdatedAt, existing.updatedAt)) return db;

  return {
    ...db,
    whatsappTemplates: db.whatsappTemplates.map((t) =>
      t.globalId === incoming.globalId
        ? {
            ...t,
            ...incoming,
            id: t.id,
            organizationId: incoming.organizationId ?? t.organizationId,
          }
        : t
    ),
  };
}

function mergeCreditLedger(db: LocalDb, change: SyncQueueEntry): LocalDb {
  const payload = change.payload as { creditLedgerEntry?: CreditLedgerEntry };
  const incoming = payload.creditLedgerEntry;
  if (!incoming?.globalId) return db;

  if (db.creditLedger.some((e) => e.globalId === incoming.globalId)) {
    return db;
  }

  const id = db.nextCreditLedgerId;
  const entry: CreditLedgerEntry = {
    ...incoming,
    id,
    organizationId: incoming.organizationId ?? change.organizationId,
  };
  return {
    ...db,
    creditLedger: [...db.creditLedger, entry],
    nextCreditLedgerId: id + 1,
  };
}

function mergeAuditLog(db: LocalDb, change: SyncQueueEntry): LocalDb {
  const payload = change.payload as { auditLogEntry?: AuditLogEntry };
  const incoming = payload.auditLogEntry;
  if (!incoming?.globalId) return db;

  if (db.auditLog.some((e) => e.globalId === incoming.globalId)) {
    return db;
  }

  const id = db.nextAuditLogId;
  const entry: AuditLogEntry = {
    ...incoming,
    id,
    organizationId: incoming.organizationId ?? change.organizationId,
  };
  return {
    ...db,
    auditLog: [...db.auditLog, entry],
    nextAuditLogId: id + 1,
  };
}

/** Kiracı eşleşmesi — eksik organizationId ile cross-tenant merge engellenir. */
export function changeMatchesTenant(
  change: SyncQueueEntry,
  activeOrganizationId: string | null | undefined
): boolean {
  const active = activeOrganizationId?.trim().toLowerCase();
  const incoming = change.organizationId?.trim().toLowerCase();
  if (!active || !incoming) return false;
  return active === incoming;
}

/** Tek bir remote change kaydını yerel DB'ye uygular (saf fonksiyon). */
export function applySyncChange(db: LocalDb, change: SyncQueueEntry): LocalDb {
  const activeOrg = db.organizationProfile?.organizationId;
  if (!changeMatchesTenant(change, activeOrg)) {
    return db;
  }

  switch (change.entityType) {
    case "customer":
      return mergeCustomer(db, change);
    case "order":
      return mergeOrder(db, change);
    case "product":
      return mergeProduct(db, change);
    case "coupon":
      return mergeCoupon(db, change);
    case "customer_tag":
      return mergeCustomerTag(db, change);
    case "service_price":
      return mergeServicePrice(db, change);
    case "organization_settings":
      return mergeOrganization(db, change);
    case "whatsapp_template":
      return mergeWhatsappTemplate(db, change);
    case "credit_ledger":
      return mergeCreditLedger(db, change);
    case "audit_log":
      return mergeAuditLog(db, change);
    default:
      return db;
  }
}

export function applySyncChanges(
  db: LocalDb,
  changes: SyncQueueEntry[]
): LocalDb {
  const sorted = [...changes].sort((a, b) =>
    a.clientUpdatedAt.localeCompare(b.clientUpdatedAt)
  );
  return sorted.reduce((acc, change) => applySyncChange(acc, change), db);
}

/** Eksik globalId'li kayıtlara v7 atar — migration/sync güvenliği. */
export function ensureEntityGlobalIds(db: LocalDb): LocalDb {
  return {
    ...db,
    customers: db.customers.map((c) => ({
      ...c,
      globalId: c.globalId ?? createGlobalId(),
      organizationId:
        c.organizationId ?? db.organizationProfile?.organizationId ?? null,
    })),
    orders: db.orders.map((o) => ({
      ...o,
      globalId: o.globalId ?? createGlobalId(),
      organizationId:
        o.organizationId ?? db.organizationProfile?.organizationId ?? null,
    })),
    orderItems: db.orderItems.map((item) => ({
      ...item,
      globalId: item.globalId ?? createGlobalId(),
      organizationId:
        item.organizationId ?? db.organizationProfile?.organizationId ?? null,
    })),
    products: db.products.map((p) => ({
      ...p,
      globalId: p.globalId ?? createGlobalId(),
      organizationId:
        p.organizationId ?? db.organizationProfile?.organizationId ?? null,
    })),
    coupons: db.coupons.map((c) => ({
      ...c,
      globalId: c.globalId ?? createGlobalId(),
      organizationId:
        c.organizationId ?? db.organizationProfile?.organizationId ?? null,
    })),
    customerTags: db.customerTags.map((t) => ({
      ...t,
      globalId: t.globalId ?? createGlobalId(),
      organizationId:
        t.organizationId ?? db.organizationProfile?.organizationId ?? null,
    })),
    servicePrices: db.servicePrices.map((sp) => ({
      ...sp,
      globalId: sp.globalId ?? createGlobalId(),
      organizationId:
        sp.organizationId ?? db.organizationProfile?.organizationId ?? null,
    })),
  };
}
