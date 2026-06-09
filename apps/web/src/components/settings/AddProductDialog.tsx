import { useState } from "react";
import { Plus } from "lucide-react";
import type { ServiceType } from "@/db/schema";
import { SERVICE_LABELS, SERVICE_TYPES } from "@/db/schema";
import { PRODUCT_ICON_OPTIONS } from "@/lib/product-icons";
import { createProduct, updateServicePrice } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const DEFAULT_PRICES: Record<ServiceType, string> = {
  dry_clean: "100",
  iron: "50",
  wash: "70",
  stain_removal: "130",
};

export function AddProductDialog({
  open,
  onOpenChange,
  onCreated,
}: AddProductDialogProps) {
  const [name, setName] = useState("");
  const [prices, setPrices] = useState<Record<ServiceType, string>>(DEFAULT_PRICES);
  const [iconName, setIconName] = useState("shirt");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setName("");
    setPrices(DEFAULT_PRICES);
    setIconName("shirt");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Ürün adı gerekli.");
      return;
    }

    for (const st of SERVICE_TYPES) {
      const price = Number(prices[st]);
      if (!Number.isFinite(price) || price < 0) {
        setError(`${SERVICE_LABELS[st]} için geçerli bir fiyat girin.`);
        return;
      }
    }

    setSaving(true);
    try {
      const basePrice = Number(prices.dry_clean);
      const product = await createProduct({
        name: name.trim(),
        iconName,
        basePrice,
      });

      for (const st of SERVICE_TYPES) {
        await updateServicePrice(product.id, st, Number(prices[st]));
      }

      resetForm();
      onCreated();
      onOpenChange(false);
    } catch {
      setError("Ürün eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-mint" />
            Yeni Ürün Ekle
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Ürün Adı</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Mont, Halı, Koltuk"
              className="h-11"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Hizmet Fiyatları (₺)
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICE_TYPES.map((st) => (
                <div key={st}>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {SERVICE_LABELS[st]}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={prices[st]}
                    onChange={(e) =>
                      setPrices({ ...prices, [st]: e.target.value })
                    }
                    className="h-10"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium">
              İkon Galerisi — POS&apos;ta görünecek simge
            </label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {PRODUCT_ICON_OPTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIconName(id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 text-[10px] transition sm:text-xs",
                    iconName === id
                      ? "border-mint bg-mint-light text-[#0f3d3a] shadow-sm ring-2 ring-mint/30"
                      : "border-border bg-background hover:border-mint/40 hover:bg-muted/30"
                  )}
                >
                  <Icon className="size-7 sm:size-8" />
                  <span className="line-clamp-2 text-center leading-tight">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Ürünü Kaydet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
