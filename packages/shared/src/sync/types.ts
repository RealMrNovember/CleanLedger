/** Mevcut yerel veritabanı şema sürümü */
export const DB_SCHEMA_VERSION = 2;

/** v1.1 hedef şema sürümü (Faz 3) */
export const DB_SCHEMA_VERSION_V1_1 = 3;

/** v1.1.2 — ürün renk seçimi (Faz 11) */
export const DB_SCHEMA_VERSION_V1_1_2 = 4;

export interface DatabaseSnapshotPayload {
  version: 1 | 2 | 3 | 4;
  updatedAt: string;
  data: Record<string, unknown>;
}

export type SyncEntityType =
  | "customer"
  | "order"
  | "order_item"
  | "order_payment"
  | "product"
  | "coupon"
  | "customer_tag"
  | "service_price"
  | "organization_settings"
  | "whatsapp_template"
  | "credit_ledger"
  | "audit_log";

export type SyncOperation = "create" | "update" | "delete";

export interface SyncQueueEntry {
  id: string;
  organizationId: string;
  entityType: SyncEntityType;
  entityGlobalId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  clientUpdatedAt: string;
  syncedAt: string | null;
}

export interface SyncPullResponse {
  success: boolean;
  organizationId?: string;
  changes?: SyncQueueEntry[];
  snapshot?: DatabaseSnapshotPayload;
  serverUpdatedAt?: string;
  message?: string;
}

export interface SyncPushRequest {
  organizationId: string;
  updatedAt: string;
  changes: SyncQueueEntry[];
  fullSnapshot?: DatabaseSnapshotPayload;
}

export interface OrganizationIdentity {
  id: string;
  email: string;
  companyName: string;
  createdAt: string;
}
