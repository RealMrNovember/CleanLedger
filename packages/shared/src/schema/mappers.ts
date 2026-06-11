import type {
  Product,
  Customer,
  CustomerTag,
  Coupon,
  Order,
  OrderItem,
  OrderPayment,
  ServicePrice,
  OrganizationSettings,
  CreditLedgerEntry,
  CreditReset,
  AuditLogEntry,
  WhatsappTemplate,
  OrderNumberSequence,
  SyncQueueRow,
  ServiceType,
  PaymentStatus,
  PaymentMethod,
  PaymentMode,
  OrderStatus,
  OrderPriority,
  CouponType,
  TagColor,
  ItemStatus,
  CreditLedgerType,
} from "./index";
import { derivePaymentStatus } from "./index";

export function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function str(value: unknown, fallback = ""): string {
  return value != null ? String(value) : fallback;
}

export function mapProduct(row: Record<string, unknown>): Product {
  const id = num(row.id);
  return {
    id,
    globalId: row.global_id != null || row.globalId != null
      ? str(row.global_id ?? row.globalId)
      : null,
    organizationId: row.organization_id != null || row.organizationId != null
      ? str(row.organization_id ?? row.organizationId)
      : null,
    name: str(row.name),
    iconName: str(row.icon_name ?? row.iconName, "default"),
    basePrice: num(row.base_price ?? row.basePrice, 0),
    sortOrder: num(row.sort_order ?? row.sortOrder, id),
  };
}

export function mapCustomerTag(row: Record<string, unknown>): CustomerTag {
  return {
    id: num(row.id),
    globalId: row.global_id != null || row.globalId != null
      ? str(row.global_id ?? row.globalId)
      : null,
    organizationId: row.organization_id != null || row.organizationId != null
      ? str(row.organization_id ?? row.organizationId)
      : null,
    slug: str(row.slug),
    label: str(row.label),
    color: str(row.color, "slate") as TagColor,
  };
}

export function mapCoupon(row: Record<string, unknown>): Coupon {
  return {
    id: num(row.id),
    globalId: row.global_id != null || row.globalId != null
      ? str(row.global_id ?? row.globalId)
      : null,
    organizationId: row.organization_id != null || row.organizationId != null
      ? str(row.organization_id ?? row.organizationId)
      : null,
    code: str(row.code).toUpperCase(),
    type: str(row.type, "percent") as CouponType,
    value: num(row.value),
    active: num(row.active, 1),
    createdAt: str(row.created_at ?? row.createdAt),
  };
}

export function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: num(row.id),
    globalId: row.global_id != null || row.globalId != null
      ? str(row.global_id ?? row.globalId)
      : null,
    organizationId: row.organization_id != null || row.organizationId != null
      ? str(row.organization_id ?? row.organizationId)
      : null,
    branchId: row.branch_id != null || row.branchId != null
      ? str(row.branch_id ?? row.branchId)
      : null,
    name: str(row.name),
    lastName: str(row.last_name ?? row.lastName),
    phone: str(row.phone),
    notes: str(row.notes),
    address: str(row.address),
    tagId: num(row.tag_id ?? row.tagId, 1),
    creditBalance: num(row.credit_balance ?? row.creditBalance, 0),
    createdAt: str(row.created_at ?? row.createdAt),
    updatedAt: str(row.updated_at ?? row.updatedAt),
  };
}

export function mapServicePrice(row: Record<string, unknown>): ServicePrice {
  return {
    id: num(row.id),
    globalId: row.global_id != null || row.globalId != null
      ? str(row.global_id ?? row.globalId)
      : null,
    organizationId: row.organization_id != null || row.organizationId != null
      ? str(row.organization_id ?? row.organizationId)
      : null,
    productId: num(row.product_id ?? row.productId),
    serviceType: str(row.service_type ?? row.serviceType) as ServiceType,
    price: num(row.price),
  };
}

export function mapOrder(row: Record<string, unknown>): Order {
  const legacyStatus = str(row.status);
  let orderStatus = str(
    row.order_status ?? row.orderStatus ?? legacyStatus,
    "preparing"
  ) as OrderStatus;
  if (orderStatus === ("received" as string)) orderStatus = "preparing";
  if (!["preparing", "ready", "delivered"].includes(orderStatus)) {
    orderStatus =
      legacyStatus === "delivered"
        ? "delivered"
        : legacyStatus === "ready"
          ? "ready"
          : "preparing";
  }

  const deliveryRaw = row.delivery_date ?? row.deliveryDate;
  const deliveryDate = deliveryRaw ? str(deliveryRaw).slice(0, 10) : "";

  let priority = str(row.priority, "normal") as OrderPriority;
  if (priority !== "normal" && priority !== "urgent") priority = "normal";

  const subtotalAmount = num(
    row.subtotal_amount ?? row.subtotalAmount ?? row.total_amount ?? row.totalAmount,
    0
  );
  const discountAmount = num(row.discount_amount ?? row.discountAmount, 0);
  const totalAmount = num(
    row.total_amount ?? row.totalAmount,
    Math.max(0, subtotalAmount - discountAmount)
  );
  const amountPaid = num(row.amount_paid ?? row.amountPaid, 0);
  const balanceDue = num(
    row.balance_due ?? row.balanceDue,
    Math.max(0, totalAmount - amountPaid)
  );

  let paymentMethod = str(row.payment_method ?? row.paymentMethod, "cash") as PaymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "card") paymentMethod = "cash";

  let paymentMode = str(row.payment_mode ?? row.paymentMode, paymentMethod) as PaymentMode;
  if (!["cash", "card", "credit", "pay_on_delivery"].includes(paymentMode)) {
    paymentMode = paymentMethod;
  }

  let paymentStatus = str(row.payment_status ?? row.paymentStatus, "unpaid") as PaymentStatus;
  if (!["paid", "partial", "unpaid", "awaiting_delivery"].includes(paymentStatus)) {
    paymentStatus = derivePaymentStatus(amountPaid, totalAmount, paymentMode);
  }
  if (paymentStatus === "unpaid" && amountPaid > 0 && balanceDue > 0) {
    paymentStatus = "partial";
  }

  return {
    id: num(row.id),
    globalId: row.global_id != null || row.globalId != null
      ? str(row.global_id ?? row.globalId)
      : null,
    organizationId: row.organization_id != null || row.organizationId != null
      ? str(row.organization_id ?? row.organizationId)
      : null,
    branchId: row.branch_id != null || row.branchId != null
      ? str(row.branch_id ?? row.branchId)
      : null,
    orderNumber: str(row.order_number ?? row.orderNumber),
    customerId:
      row.customer_id != null || row.customerId != null
        ? num(row.customer_id ?? row.customerId)
        : null,
    customerPhone: str(row.customer_phone ?? row.customerPhone),
    subtotalAmount,
    discountAmount,
    totalAmount,
    amountPaid,
    balanceDue,
    paymentMethod,
    paymentMode,
    couponCode:
      row.coupon_code != null || row.couponCode != null
        ? str(row.coupon_code ?? row.couponCode)
        : null,
    paymentStatus,
    orderStatus,
    deliveryDate,
    priority,
    createdAt: str(row.created_at ?? row.createdAt),
  };
}

export function mapOrderItem(row: Record<string, unknown>): OrderItem {
  const subtotal = num(row.subtotal);
  const originalPrice = num(row.original_price ?? row.originalPrice, subtotal);
  const salePrice = num(row.sale_price ?? row.salePrice, subtotal);

  let itemStatus = str(row.item_status ?? row.itemStatus, "received") as ItemStatus;
  if (!["received", "preparing", "processing", "qc", "ready", "delivered", "cancelled"].includes(itemStatus)) {
    itemStatus = "received";
  }

  return {
    id: num(row.id),
    globalId: row.global_id != null || row.globalId != null
      ? str(row.global_id ?? row.globalId)
      : null,
    organizationId: row.organization_id != null || row.organizationId != null
      ? str(row.organization_id ?? row.organizationId)
      : null,
    orderId: num(row.order_id ?? row.orderId),
    productId: num(row.product_id ?? row.productId),
    itemNumber: str(row.item_number ?? row.itemNumber),
    serviceType: str(row.service_type ?? row.serviceType) as ServiceType,
    quantity: num(row.quantity, 1),
    originalPrice,
    salePrice,
    subtotal,
    itemStatus,
    color:
      row.color != null && String(row.color).trim()
        ? str(row.color)
        : null,
  };
}

export function mapOrderPayment(row: Record<string, unknown>): OrderPayment {
  let paymentMethod = str(row.payment_method ?? row.paymentMethod, "cash") as PaymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "card") paymentMethod = "cash";
  return {
    id: num(row.id),
    globalId: row.global_id != null || row.globalId != null
      ? str(row.global_id ?? row.globalId)
      : null,
    organizationId: row.organization_id != null || row.organizationId != null
      ? str(row.organization_id ?? row.organizationId)
      : null,
    orderId: num(row.order_id ?? row.orderId),
    amount: num(row.amount),
    paymentMethod,
    createdAt: str(row.created_at ?? row.createdAt),
    refunded: num(row.refunded, 0),
  };
}

export function mapOrganizationSettings(
  row: Record<string, unknown>
): OrganizationSettings {
  return {
    id: num(row.id),
    globalId: row.global_id != null || row.globalId != null
      ? str(row.global_id ?? row.globalId)
      : null,
    organizationId: str(row.organization_id ?? row.organizationId),
    companyName: str(row.company_name ?? row.companyName),
    adminName: str(row.admin_name ?? row.adminName),
    email: str(row.email),
    phone: str(row.phone),
    address: str(row.address),
    logoDataUrl: row.logo_data_url != null || row.logoDataUrl != null
      ? str(row.logo_data_url ?? row.logoDataUrl)
      : null,
    logoHash:
      row.logo_hash != null || row.logoHash != null
        ? str(row.logo_hash ?? row.logoHash) || null
        : null,
    authToken: str(row.auth_token ?? row.authToken),
    trialEndsAt: str(row.trial_ends_at ?? row.trialEndsAt),
    updatedAt: str(row.updated_at ?? row.updatedAt),
  };
}

export function mapCreditLedger(row: Record<string, unknown>): CreditLedgerEntry {
  return {
    id: num(row.id),
    globalId: str(row.global_id ?? row.globalId),
    organizationId: str(row.organization_id ?? row.organizationId),
    customerId: num(row.customer_id ?? row.customerId),
    orderId:
      row.order_id != null || row.orderId != null
        ? num(row.order_id ?? row.orderId)
        : null,
    resetId:
      row.reset_id != null || row.resetId != null
        ? num(row.reset_id ?? row.resetId)
        : null,
    entryType: str(row.entry_type ?? row.entryType) as CreditLedgerType,
    amount: num(row.amount),
    balanceAfter: num(row.balance_after ?? row.balanceAfter, 0),
    note: str(row.note),
    createdAt: str(row.created_at ?? row.createdAt),
  };
}

export function mapCreditReset(row: Record<string, unknown>): CreditReset {
  return {
    id: num(row.id),
    globalId: str(row.global_id ?? row.globalId),
    organizationId: str(row.organization_id ?? row.organizationId),
    customerId: num(row.customer_id ?? row.customerId),
    amountReset: num(row.amount_reset ?? row.amountReset),
    resetAt: str(row.reset_at ?? row.resetAt),
    undoneAt:
      row.undone_at != null || row.undoneAt != null
        ? str(row.undone_at ?? row.undoneAt)
        : null,
    note: str(row.note),
  };
}

export function mapAuditLog(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: num(row.id),
    globalId: str(row.global_id ?? row.globalId),
    organizationId: str(row.organization_id ?? row.organizationId),
    entityType: str(row.entity_type ?? row.entityType),
    entityGlobalId:
      row.entity_global_id != null || row.entityGlobalId != null
        ? str(row.entity_global_id ?? row.entityGlobalId)
        : null,
    action: str(row.action),
    payload: str(row.payload, "{}"),
    actorEmail:
      row.actor_email != null || row.actorEmail != null
        ? str(row.actor_email ?? row.actorEmail)
        : null,
    createdAt: str(row.created_at ?? row.createdAt),
  };
}

export function mapWhatsappTemplate(row: Record<string, unknown>): WhatsappTemplate {
  return {
    id: num(row.id),
    globalId: str(row.global_id ?? row.globalId),
    organizationId: str(row.organization_id ?? row.organizationId),
    slug: str(row.slug),
    name: str(row.name),
    body: str(row.body),
    active: num(row.active, 1),
    updatedAt: str(row.updated_at ?? row.updatedAt),
  };
}

export function mapOrderNumberSequence(
  row: Record<string, unknown>
): OrderNumberSequence {
  return {
    id: num(row.id),
    organizationId: str(row.organization_id ?? row.organizationId),
    year: num(row.year),
    lastSequence: num(row.last_sequence ?? row.lastSequence, 0),
  };
}

export function mapSyncQueueRow(row: Record<string, unknown>): SyncQueueRow {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id ?? row.organizationId),
    entityType: str(row.entity_type ?? row.entityType),
    entityGlobalId: str(row.entity_global_id ?? row.entityGlobalId),
    operation: str(row.operation),
    payload: str(row.payload, "{}"),
    clientUpdatedAt: str(row.client_updated_at ?? row.clientUpdatedAt),
    syncedAt:
      row.synced_at != null || row.syncedAt != null
        ? str(row.synced_at ?? row.syncedAt)
        : null,
  };
}
