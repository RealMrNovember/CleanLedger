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

export function CouponsPanel() {
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
        <CardTitle>Kuponlar</CardTitle>
        <p className="text-sm text-muted-foreground">
          POS ekranında uygulanacak indirim kodlarını tanımlayın.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-xl border border-border/60 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Kupon Kodu</label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="KURU20"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tür</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as CouponType })
                }
                className="h-11 w-full rounded-xl border-2 border-input bg-card px-3 text-sm"
              >
                <option value="percent">Yüzde (%)</option>
                <option value="fixed">Sabit Tutar (TL)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Değer</label>
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
                Aktif
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {editingId ? "Güncelle" : "Kupon Ekle"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                İptal
              </Button>
            )}
          </div>
        </form>

        {coupons.length === 0 ? (
          <p className="text-center text-muted-foreground">Henüz kupon yok.</p>
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
                    {coupon.active ? "Aktif" : "Pasif"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(coupon)}
                  >
                    Düzenle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Kupon silinsin mi?")) {
                        void deleteCoupon(coupon.id).then(load);
                      }
                    }}
                  >
                    Sil
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
