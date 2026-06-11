import { renderTemplate, type TemplateVariable } from "./engine";

export interface OrderWhatsAppLine {
  productName: string;
  serviceLabel: string;
  price: number;
}

export function formatOrderItemsForTemplate(lines: OrderWhatsAppLine[]): string {
  return lines
    .map((line) => {
      const price = line.price.toLocaleString("tr-TR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return `• ${line.productName} (${line.serviceLabel}): ${price} TL`;
    })
    .join("\n");
}

export function buildOrderTemplateVars(options: {
  companyName: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  deliveryDate: string;
  lines: OrderWhatsAppLine[];
}): Partial<Record<TemplateVariable, string>> {
  const total = options.totalAmount.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  let deliveryLabel = options.deliveryDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(options.deliveryDate)) {
    const [y, m, d] = options.deliveryDate.split("-").map(Number);
    deliveryLabel = new Date(y, m - 1, d).toLocaleDateString("tr-TR");
  }

  return {
    firma_adi: options.companyName,
    musteri_adi: options.customerName.trim() || "Müşterimiz",
    siparis_no: options.orderNumber,
    toplam_tutar: `${total} TL`,
    teslim_tarihi: deliveryLabel,
    kalemler: formatOrderItemsForTemplate(options.lines),
  };
}

export function renderWhatsappOrderMessage(
  templateBody: string,
  options: Parameters<typeof buildOrderTemplateVars>[0]
): string {
  return renderTemplate(templateBody, buildOrderTemplateVars(options));
}
