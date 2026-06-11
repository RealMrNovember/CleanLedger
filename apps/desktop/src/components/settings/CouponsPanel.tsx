import { useCallback, useEffect, useState } from "react";
import type { Coupon, CouponType } from "@/db/schema";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/context/I18nContext";

export function CouponsPanel() {
  const { t } = useI18n();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    code: "",
    type: "percent" as CouponType,
    value: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setCoupons(await getCoupons());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ code: "", type: "percent", value: "", active: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(form.value);
    if (!form.code.trim() || !Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value,
        active: form.active,
      };
      if (editingId) {
        await updateCoupon(editingId, payload);
      } else {
        await createCoupon(payload);
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type as CouponType,
      value: String(coupon.value),
      active: coupon.active === 1,
    });
  };

  const formatDiscount = (coupon: Coupon) =>
    coupon.type === "percent"
      ? `%${coupon.value}`
      : formatCurrency(coupon.value);

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>{t("settings.couponsTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.couponsHint")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-xl border border-border/60 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("settings.couponCode")}
              </label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder={t("settings.couponCodePlaceholder")}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("settings.couponType")}
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as CouponType })
                }
                className="h-11 w-full rounded-xl border-2 border-input bg-card px-3 text-sm"
              >
                <option value="percent">{t("settings.couponTypePercent")}</option>
                <option value="fixed">{t("settings.couponTypeFixed")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("settings.couponValue")}
              </label>
              <Input
                type="number"
                min={1}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === "percent" ? "20" : "50"}
                required
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="size-4 rounded border-input"
                />
                {t("settings.active")}
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {editingId ? t("settings.couponUpdate") : t("settings.couponAdd")}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </form>

        {coupons.length === 0 ? (
          <p className="text-center text-muted-foreground">
            {t("settings.couponsEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{coupon.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDiscount(coupon)} ·{" "}
                    {coupon.active ? t("settings.active") : t("settings.inactive")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(coupon)}
                  >
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(t("settings.couponDeleteConfirm"))) {
                        void deleteCoupon(coupon.id).then(load);
                      }
                    }}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
