import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, Printer, Tag } from "lucide-react";
import type { Order } from "@/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  ReceiptPrintDialog,
  type ReceiptData,
} from "@/components/pos/ReceiptPrintDialog";
import { getWhatsappTemplateBySlug } from "@/db/client";
import { renderWhatsappOrderMessage } from "@cleanledger/shared/templates";
import { buildProductLabelsFromReceipt } from "@cleanledger/shared/print";
import { buildWhatsAppUrl, openWhatsApp } from "@/lib/whatsapp";
import { useI18n } from "@/context/I18nContext";
import { ProductLabelPrintDialog } from "@/components/pos/ProductLabelPrintDialog";

interface OrderSuccessDialogProps {
  open: boolean;
  order: Order | null;
  receipt: ReceiptData | null;
  onClose: () => void;
}

export function OrderSuccessDialog({
  open,
  order,
  receipt,
  onClose,
}: OrderSuccessDialogProps) {
  const { t } = useI18n();
  const [printOpen, setPrintOpen] = useState(false);
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !order || !receipt) {
      setWhatsappMessage(null);
      return;
    }
    void (async () => {
      const template = await getWhatsappTemplateBySlug("order_received");
      const body =
        template?.body ??
        t("pos.whatsappDefaultTemplate");
      setWhatsappMessage(
        renderWhatsappOrderMessage(body, {
          companyName: receipt.companyName,
          customerName: receipt.customerName ?? "",
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          deliveryDate: order.deliveryDate,
          lines: receipt.lines.map((line) => ({
            productName: line.productName,
            serviceLabel: line.serviceLabel,
            price: line.unitPrice,
          })),
        })
      );
    })();
  }, [open, order, receipt, t]);

  if (!order) return null;

  const productLabels = receipt ? buildProductLabelsFromReceipt(receipt) : [];

  const handleWhatsApp = () => {
    if (!receipt?.customerPhone || !whatsappMessage) return;
    void openWhatsApp(buildWhatsAppUrl(receipt.customerPhone, whatsappMessage));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-mint-light">
              <CheckCircle2 className="size-9 text-mint" />
            </div>
            <DialogTitle className="text-center text-2xl">
              {t("pos.successTitle")}
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              {t("pos.successSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-2xl bg-muted/50 p-5 text-center">
            <p className="text-sm text-muted-foreground">{t("pos.successReceiptNo")}</p>
            <p className="text-2xl font-bold tracking-wide">{order.orderNumber}</p>
            <p className="text-3xl font-bold text-trust">
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setPrintOpen(true)}
              >
                <Printer className="size-4" />
                {t("pos.successCustomerReceipt")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2"
                disabled={productLabels.length === 0}
                onClick={() => setLabelPrintOpen(true)}
              >
                <Tag className="size-4" />
                {t("pos.successProductLabel")}
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 gap-2"
              disabled={!receipt?.customerPhone || !whatsappMessage}
              onClick={handleWhatsApp}
            >
              <MessageCircle className="size-4" />
              {t("pos.successWhatsapp")}
            </Button>
            <Button size="lg" className="flex-1" onClick={onClose}>
              {t("pos.successNewOrder")}
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        receipt={receipt}
      />
      <ProductLabelPrintDialog
        open={labelPrintOpen}
        onOpenChange={setLabelPrintOpen}
        labels={productLabels}
      />
    </>
  );
}
