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
} from "./index";
import type { ProductColorPreset } from "../colors/product-palette";
import { DB_SCHEMA_VERSION_V1_1_2 } from "../sync/types";

/** Web localStorage ve sync snapshot veri yapısı */
export interface LocalDb {
  schemaVersion: number;
  products: Product[];
  customers: Customer[];
  customerTags: CustomerTag[];
  coupons: Coupon[];
  servicePrices: ServicePrice[];
  orders: Order[];
  orderItems: OrderItem[];
  orderPayments: OrderPayment[];
  organizationProfile: OrganizationSettings | null;
  creditLedger: CreditLedgerEntry[];
  creditResets: CreditReset[];
  auditLog: AuditLogEntry[];
  whatsappTemplates: WhatsappTemplate[];
  syncQueue: SyncQueueRow[];
  orderNumberSequences: OrderNumberSequence[];
  productColorPalette: ProductColorPreset[];
  nextProductId: number;
  nextCustomerId: number;
  nextCustomerTagId: number;
  nextCouponId: number;
  nextServicePriceId: number;
  nextOrderId: number;
  nextOrderItemId: number;
  nextOrderPaymentId: number;
  nextOrderNumber: number;
  nextCreditLedgerId: number;
  nextCreditResetId: number;
  nextAuditLogId: number;
  nextWhatsappTemplateId: number;
}

export const LOCAL_DB_SCHEMA_VERSION = DB_SCHEMA_VERSION_V1_1_2;

export interface DatabaseSnapshot {
  version: typeof LOCAL_DB_SCHEMA_VERSION;
  updatedAt: string;
  data: LocalDb;
}
