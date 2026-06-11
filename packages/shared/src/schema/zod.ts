import { z } from "zod";
import { LOCAL_DB_SCHEMA_VERSION } from "./local-db";

const nullableStr = z.string().nullable();

export const organizationSettingsSchema = z.object({
  id: z.number().int().positive().optional(),
  globalId: nullableStr,
  organizationId: z.string(),
  companyName: z.string(),
  adminName: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  logoDataUrl: nullableStr,
  logoHash: nullableStr,
  authToken: z.string(),
  trialEndsAt: z.string(),
  updatedAt: z.string(),
});

export const customerSchema = z.object({
  id: z.number().int().positive(),
  globalId: nullableStr,
  organizationId: nullableStr,
  branchId: nullableStr,
  name: z.string(),
  lastName: z.string().nullable(),
  phone: z.string(),
  notes: z.string().nullable(),
  address: z.string().nullable(),
  tagId: z.number().int(),
  creditBalance: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const orderSchema = z.object({
  id: z.number().int().positive(),
  globalId: nullableStr,
  organizationId: nullableStr,
  branchId: nullableStr,
  orderNumber: z.string(),
  customerId: z.number().int().nullable(),
  customerPhone: z.string(),
  subtotalAmount: z.number(),
  discountAmount: z.number(),
  totalAmount: z.number(),
  amountPaid: z.number(),
  balanceDue: z.number(),
  paymentMethod: z.string(),
  paymentMode: z.string(),
  couponCode: nullableStr,
  paymentStatus: z.string(),
  orderStatus: z.string(),
  deliveryDate: z.string(),
  priority: z.string(),
  createdAt: z.string(),
});

export const orderItemSchema = z.object({
  id: z.number().int().positive(),
  globalId: nullableStr,
  organizationId: nullableStr,
  orderId: z.number().int().positive(),
  productId: z.number().int().positive(),
  itemNumber: z.string(),
  serviceType: z.string(),
  quantity: z.number().int().positive(),
  originalPrice: z.number(),
  salePrice: z.number(),
  subtotal: z.number(),
  itemStatus: z.string(),
  color: nullableStr.optional(),
});

const productColorPresetSchema = z.object({
  label: z.string(),
  hex: z.string(),
});

export const localDbV3Schema = z.object({
  schemaVersion: z.literal(LOCAL_DB_SCHEMA_VERSION),
  products: z.array(z.record(z.unknown())).default([]),
  customers: z.array(customerSchema).default([]),
  customerTags: z.array(z.record(z.unknown())).default([]),
  coupons: z.array(z.record(z.unknown())).default([]),
  servicePrices: z.array(z.record(z.unknown())).default([]),
  orders: z.array(orderSchema).default([]),
  orderItems: z.array(orderItemSchema).default([]),
  productColorPalette: z.array(productColorPresetSchema).default([]),
  orderPayments: z.array(z.record(z.unknown())).default([]),
  organizationProfile: organizationSettingsSchema.nullable().optional(),
  creditLedger: z.array(z.record(z.unknown())).default([]),
  creditResets: z.array(z.record(z.unknown())).default([]),
  auditLog: z.array(z.record(z.unknown())).default([]),
  whatsappTemplates: z.array(z.record(z.unknown())).default([]),
  syncQueue: z.array(z.record(z.unknown())).default([]),
  orderNumberSequences: z.array(z.record(z.unknown())).default([]),
  nextProductId: z.number().int().positive(),
  nextCustomerId: z.number().int().positive(),
  nextCustomerTagId: z.number().int().positive(),
  nextCouponId: z.number().int().positive(),
  nextServicePriceId: z.number().int().positive(),
  nextOrderId: z.number().int().positive(),
  nextOrderItemId: z.number().int().positive(),
  nextOrderPaymentId: z.number().int().positive(),
  nextOrderNumber: z.number().int().positive(),
  nextCreditLedgerId: z.number().int().positive(),
  nextCreditResetId: z.number().int().positive(),
  nextAuditLogId: z.number().int().positive(),
  nextWhatsappTemplateId: z.number().int().positive(),
});

export type OrganizationSettingsZod = z.infer<typeof organizationSettingsSchema>;
export type LocalDbV3Zod = z.infer<typeof localDbV3Schema>;

/** Migration sonrası şema doğrulama — hata fırlatmaz, uyarı döner. */
export function validateLocalDbShape(
  db: unknown
): { ok: true; data: LocalDbV3Zod } | { ok: false; issues: string[] } {
  const result = localDbV3Schema.safeParse(db);
  if (result.success) return { ok: true, data: result.data };
  const issues = result.error.issues.map(
    (i) => `${i.path.join(".") || "root"}: ${i.message}`
  );
  return { ok: false, issues };
}
