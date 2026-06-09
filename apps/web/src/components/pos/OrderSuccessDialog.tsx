import { useState } from "react";
import { CheckCircle2, Printer } from "lucide-react";
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
  const [printOpen, setPrintOpen] = useState(false);

  if (!order) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-mint-light">
              <CheckCircle2 className="size-9 text-mint" />
            </div>
            <DialogTitle className="text-center text-2xl">
              Sipariş Kaydedildi
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Fiş yazdırmaya hazır
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-2xl bg-muted/50 p-5 text-center">
            <p className="text-sm text-muted-foreground">Fiş No</p>
            <p className="text-2xl font-bold tracking-wide">{order.orderNumber}</p>
            <p className="text-3xl font-bold text-trust">
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setPrintOpen(true)}
            >
              <Printer className="size-4" />
              Yazdır
            </Button>
            <Button size="lg" className="flex-1" onClick={onClose}>
              Yeni Sipariş
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        receipt={receipt}
      />
    </>
  );
}
