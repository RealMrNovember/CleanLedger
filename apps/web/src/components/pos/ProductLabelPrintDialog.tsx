import { useEffect, useRef } from "react";
import { Printer, Tag } from "lucide-react";
import type { ProductLabelData } from "@cleanledger/shared/print";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseDateKey } from "@/lib/dates";
import { useI18n } from "@/context/I18nContext";
import {
  applyThermalReceiptDomWidth,
  printThermalProductLabels,
} from "@/lib/thermal-print";

interface ProductLabelPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: ProductLabelData[];
}

export function ProductLabelPrintDialog({
  open,
  onOpenChange,
  labels,
}: ProductLabelPrintDialogProps) {
  const { t, locale, translateProduct, translateColor } = useI18n();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      applyThermalReceiptDomWidth(printRef.current);
    }
  }, [open, labels]);

  if (labels.length === 0) return null;

  const handlePrint = async (preferEscPos = false) => {
    await printThermalProductLabels(labels, { preferEscPos });
  };

  const dateLocale =
    locale === "tr" ? "tr-TR" : locale === "en" ? "en-US" : locale;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            {t("pos.productLabelsTitle")}
          </DialogTitle>
        </DialogHeader>

        <div
          ref={printRef}
          id="cleanledger-receipt"
          className="receipt-preview mx-auto space-y-3 rounded-lg border border-dashed border-border bg-white p-4 text-black print:border-none"
        >
          {labels.map((label) => {
            const productName = translateProduct({
              name: label.productName,
              iconName: null,
            });
            const colorLabel = label.colorLabel
              ? translateColor({ label: label.colorLabel, hex: "#000000" })
              : null;

            return (
            <div
              key={label.itemNumber}
              className="border-b border-black/15 pb-3 last:border-0"
            >
              <p className="text-center text-sm font-bold uppercase">
                {label.companyName}
              </p>
              <p className="mt-2 text-center text-lg font-bold">
                {label.itemNumber}
              </p>
              <p className="text-xs">
                {t("reports.labelOrder")} {label.orderNumber}
              </p>
              <p className="text-xs">
                {t("reports.labelCustomer")} {label.customerName}
              </p>
              <p className="text-xs">
                {t("pos.delivery")}{" "}
                {parseDateKey(label.deliveryDate).toLocaleDateString(dateLocale)}
              </p>
              <p className="mt-2 text-sm font-semibold">{productName}</p>
              <p className="text-xs text-black/70">{label.serviceLabel}</p>
              {colorLabel ? (
                <p className="text-xs">
                  {t("pos.colorLabel")} {colorLabel}
                </p>
              ) : null}
            </div>
          );
          })}
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
