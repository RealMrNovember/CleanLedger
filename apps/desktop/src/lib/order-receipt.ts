import type { Order, ServiceType } from "@/db/schema";
import { SERVICE_LABELS } from "@/db/schema";
import {
  getCustomerById,
  getCustomerByPhone,
  getOrderByIdPublic,
  getOrderItemsForOrder,
} from "@/db/client";
import { getShopProfile, shopProfileToContact } from "@/lib/shop-profile";
import { formatCustomerName } from "@/lib/utils";
import type { ReceiptData } from "@/components/pos/ReceiptPrintDialog";

export async function buildReceiptDataForOrder(
  orderId: number
): Promise<ReceiptData | null> {
  const order = await getOrderByIdPublic(orderId);
  if (!order) return null;

  const items = await getOrderItemsForOrder(orderId);
  const shop = getShopProfile();

  let customerName: string | undefined;
  if (order.customerId) {
    const c = await getCustomerById(order.customerId);
    if (c) customerName = formatCustomerName(c);
  }
  if (!customerName) {
    const c = await getCustomerByPhone(order.customerPhone);
    if (c) customerName = formatCustomerName(c);
  }

  return {
    order,
    companyName: shop.companyName,
    customerPhone: order.customerPhone,
    customerName,
    lines: items.map((item) => ({
      productName: item.productName,
      serviceLabel: SERVICE_LABELS[item.serviceType as ServiceType],
      unitPrice: item.subtotal,
    })),
    discountAmount: order.discountAmount,
    amountPaid: order.amountPaid,
    balanceDue: order.balanceDue,
    shopContact: shopProfileToContact(shop),
  };
}

export async function buildReceiptDataFromOrder(
  order: Order,
  customerName?: string
): Promise<ReceiptData> {
  const data = await buildReceiptDataForOrder(order.id);
  if (!data) {
    throw new Error("Sipariş bulunamadı.");
  }
  if (customerName) {
    return { ...data, customerName };
  }
  return data;
}
