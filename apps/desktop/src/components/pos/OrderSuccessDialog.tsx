import { CheckCircle2 } from "lucide-react";
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

interface OrderSuccessDialogProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
}

export function OrderSuccessDialog({
  open,
  order,
  onClose,
}: OrderSuccessDialogProps) {
  if (!order) return null;

  return (
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
            Fiş yazdırılmaya hazır
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-2xl bg-muted/50 p-5 text-center">
          <p className="text-sm text-muted-foreground">Fiş No</p>
          <p className="text-2xl font-bold tracking-wide">{order.orderNumber}</p>
          <p className="text-3xl font-bold text-trust">
            {formatCurrency(order.totalAmount)}
          </p>
        </div>
        <Button size="lg" className="w-full" onClick={onClose}>
          Yeni Sipariş
        </Button>
      </DialogContent>
    </Dialog>
  );
}
