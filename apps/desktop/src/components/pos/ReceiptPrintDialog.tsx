import { useRef } from "react";
import { Printer } from "lucide-react";
import type { Order } from "@/db/schema";
import { PAYMENT_STATUS_LABELS } from "@/db/schema";
import type { PaymentStatus } from "@/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import {
  buildReceiptSummaryRows,
  formatReceiptLineLabel,
  triggerBrowserPrint,
  type ShopContactInfo,
} from "@/lib/print-service";
import { cn, formatCurrency } from "@/lib/utils";

export interface ReceiptLine {
  productName: string;
  serviceLabel: string;
  unitPrice: number;
}

export interface ReceiptData {
  order: Order;
  companyName: string;
  customerPhone: string;
  customerName?: string;
  lines: ReceiptLine[];
  discountAmount?: number;
  amountPaid?: number;
  balanceDue?: number;
  shopContact?: ShopContactInfo;
}

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
  const printRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const shop = receipt.shopContact ?? {
    companyName: receipt.companyName,
    phone: "+90 535 489 50 50",
    email: "destek@cicibyte.com",
    address: "www.cicibyte.com",
  };

  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const summaryRows = buildReceiptSummaryRows(receipt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Fiş Önizleme</DialogTitle>
        </DialogHeader>

        <div
          ref={printRef}
          id="cleanledger-receipt"
          className="mx-auto w-full max-w-[320px] rounded-lg border border-dashed border-border bg-white p-5 font-mono text-sm text-black shadow-inner print:border-none print:shadow-none"
        >
          <div className="border-b border-black/20 pb-3 text-center">
            <div className="mb-3 flex justify-center print:[&_*]:text-black">
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
              Fiş No: {receipt.order.orderNumber}
            </p>
            <p className="text-xs">
              Müşteri: {receipt.customerName ?? receipt.customerPhone}
            </p>
            <p className="text-[10px] text-black/60">{today}</p>
          </div>

          <div className="my-3 space-y-2">
            {receipt.lines.map((line, idx) => (
              <div key={idx} className="border-b border-black/10 pb-2 last:border-0">
                <p className="font-semibold">
                  {formatReceiptLineLabel(line.productName, line.serviceLabel)}
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
              {PAYMENT_STATUS_LABELS[receipt.order.paymentStatus as PaymentStatus]}
            </p>
            <p className="pt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-black/60">
              Cicibyte · CleanLedger
            </p>
          </div>
        </div>

        <div className="flex gap-2 print:hidden">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          <Button className="flex-1 gap-2" onClick={triggerBrowserPrint}>
            <Printer className="size-4" />
            Yazdır
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
