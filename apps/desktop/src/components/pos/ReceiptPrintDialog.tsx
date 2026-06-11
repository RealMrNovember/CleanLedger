import { useEffect, useRef } from "react";
import { Printer } from "lucide-react";
import type { PaymentStatus } from "@/db/schema";
import { useI18n } from "@/context/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { getShopProfile, shopProfileToContact } from "@/lib/shop-profile";
import {
  buildReceiptSummaryRows,
  formatReceiptLineLabel,
  type ReceiptData,
} from "@/lib/print-service";
import {
  applyThermalReceiptDomWidth,
  printThermalCustomerReceipt,
} from "@/lib/thermal-print";
import { cn, formatCurrency } from "@/lib/utils";

export type { ReceiptData, ReceiptLine } from "@/lib/print-service";

interface ReceiptPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptData | null;
}

export function ReceiptPrintDialog({
  open,
  onOpenChange,
  receipt,
}: ReceiptPrintDialogProps) {
  const { t, labels, locale, translateProduct, translateColor } = useI18n();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !receipt) return;
    applyThermalReceiptDomWidth(printRef.current);
  }, [open, receipt]);

  if (!receipt) return null;

  const shop = receipt.shopContact ?? shopProfileToContact(getShopProfile());

  const today = new Date().toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const summaryRows = buildReceiptSummaryRows(receipt);

  const handlePrint = async (preferEscPos = false) => {
    await printThermalCustomerReceipt(receipt, { preferEscPos });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>{t("pos.receiptPreview")}</DialogTitle>
        </DialogHeader>

        <div
          ref={printRef}
          id="cleanledger-receipt"
          className="receipt-preview mx-auto w-[300px] max-w-full rounded-lg border border-dashed border-border bg-white p-4 text-black shadow-inner print:border-none print:shadow-none"
          style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}
        >
          <div className="border-b border-black/15 pb-3 text-center">
            <div className="receipt-logo-wrap mb-3 flex justify-center">
              <Logo size="sm" showText className="flex-col items-center gap-1" />
            </div>
            <p className="text-base font-bold uppercase tracking-wide">
              {shop.companyName}
            </p>
            {shop.phone && (
              <p className="mt-1 text-xs text-black/70">Tel: {shop.phone}</p>
            )}
            {shop.email && (
              <p className="text-xs text-black/70">{shop.email}</p>
            )}
            {shop.address && (
              <p className="text-xs text-black/70">{shop.address}</p>
            )}
            <p className="mt-3 text-xs font-semibold">
              {t("pos.receiptNoLabel")} {receipt.order.orderNumber}
            </p>
            <p className="text-xs">
              {t("reports.receiptCustomer")} {receipt.customerName ?? receipt.customerPhone}
            </p>
            <p className="text-[10px] text-black/60">{today}</p>
          </div>

          <div className="my-3 space-y-2">
            {receipt.lines.map((line, idx) => (
              <div key={idx} className="border-b border-black/10 pb-2 last:border-0">
                <p className="font-semibold">
                  {formatReceiptLineLabel(
                    translateProduct({ name: line.productName, iconName: null }),
                    line.serviceLabel
                  )}
                  {line.colorLabel
                    ? ` · ${translateColor({ label: line.colorLabel, hex: "#000000" })}`
                    : ""}
                </p>
                <div className="flex justify-end text-xs">
                  <span>{formatCurrency(line.unitPrice)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t-2 border-black pt-3 text-sm">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className={cn(
                  "flex justify-between gap-4",
                  row.emphasis && "font-bold",
                  row.label === "Kalan Borç" &&
                    row.emphasis &&
                    "text-red-700"
                )}
              >
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
            <p className="pt-2 text-center text-xs">
              {labels.paymentStatus[receipt.order.paymentStatus as PaymentStatus]}
            </p>
            <p className="pt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-black/60">
              Cicibyte · CleanLedger
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 print:hidden sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button className="flex-1 gap-2" onClick={() => void handlePrint(false)}>
            <Printer className="size-4" />
            {t("common.print")}
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => void handlePrint(true)}
          >
            {t("pos.escPos")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
