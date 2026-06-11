import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { ServiceType } from "@/db/schema";
import { SERVICE_TYPES } from "@/db/schema";
import { useI18n } from "@/context/I18nContext";
import { suggestIconFromProductName } from "@/lib/product-icons";
import { IconGalleryPicker } from "@/components/settings/IconGalleryPicker";
import { createProduct, updateServicePrice } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const { t, labels } = useI18n();
  const [name, setName] = useState("");
  const [prices, setPrices] = useState<Record<ServiceType, string>>(DEFAULT_PRICES);
  const [iconName, setIconName] = useState("shirt");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const iconManuallyPicked = useRef(false);

  useEffect(() => {
    if (!open || iconManuallyPicked.current || !name.trim()) return;
    setIconName(suggestIconFromProductName(name));
  }, [name, open]);

  const resetForm = () => {
    setName("");
    setPrices(DEFAULT_PRICES);
    setIconName("shirt");
    setError("");
    iconManuallyPicked.current = false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError(t("settings.productNameRequired"));
      return;
    }

    for (const st of SERVICE_TYPES) {
      const price = Number(prices[st]);
      if (!Number.isFinite(price) || price < 0) {
        setError(
          t("settings.productPriceInvalid", { service: labels.service[st] })
        );
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
      setError(t("settings.productAddFailed"));
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
            {t("pos.catalogAddProduct")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              {t("settings.productNameLabel")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.productNamePlaceholder")}
              className="h-11"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              {t("settings.servicePricesLabel")}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICE_TYPES.map((st) => (
                <div key={st}>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {labels.service[st]}
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
              {t("settings.productIconLabel")}
            </label>
            <IconGalleryPicker
              value={iconName}
              previewName={name.trim() || t("settings.sampleProduct")}
              onChange={(id) => {
                iconManuallyPicked.current = true;
                setIconName(id);
              }}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? t("common.saving") : t("settings.addProductSave")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
