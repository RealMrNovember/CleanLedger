import { useCallback, useEffect, useState } from "react";
import type { ProductColorPreset } from "@cleanledger/shared";
import { DEFAULT_PRODUCT_COLOR_PALETTE } from "@cleanledger/shared";
import {
  getProductColorPalette,
  saveProductColorPalette,
} from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorDot } from "@/components/pos/ColorPickerPopover";
import { Trash2, Plus, RotateCcw } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export function ProductColorPalettePanel() {
  const { t, translateColor } = useI18n();
  const [palette, setPalette] = useState<ProductColorPreset[]>([]);
  const [form, setForm] = useState({ label: "", hex: "#1a1a1a" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setPalette(await getProductColorPalette());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: ProductColorPreset[]) => {
    setSaving(true);
    try {
      await saveProductColorPalette(next);
      setPalette(next);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.hex.trim()) return;
    const next = [...palette, { label: form.label.trim(), hex: form.hex.trim() }];
    setForm({ label: "", hex: "#1a1a1a" });
    await persist(next);
  };

  const handleRemove = async (index: number) => {
    const next = palette.filter((_, i) => i !== index);
    await persist(next);
  };

  const handleReset = async () => {
    if (!confirm(t("settings.colorsResetConfirm"))) return;
    await persist(DEFAULT_PRODUCT_COLOR_PALETTE.map((p) => ({ ...p })));
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{t("settings.colorsTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.colorsHint")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-2">
          {palette.map((preset, index) => {
            const displayLabel = translateColor(preset);
            return (
              <li
                key={`${preset.hex}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ColorDot hex={preset.hex} label={displayLabel} />
                  <div className="min-w-0">
                    <p className="font-medium">{displayLabel}</p>
                    <p className="text-xs text-muted-foreground">{preset.hex}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={saving}
                  onClick={() => void handleRemove(index)}
                  aria-label={t("settings.colorsRemoveAria", { color: displayLabel })}
                >
                  <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>

        <form
          onSubmit={(e) => void handleAdd(e)}
          className="space-y-3 rounded-xl border border-dashed border-border/60 p-4"
        >
          <p className="text-sm font-medium">{t("settings.colorsAddNew")}</p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={t("settings.colorsLabelPlaceholder")}
              className="min-w-[140px] flex-1"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.hex}
                onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
                className="size-10 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
                aria-label={t("pos.colorPick")}
              />
              <Input
                value={form.hex}
                onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
                className="w-28 font-mono text-xs"
              />
            </div>
            <Button type="submit" disabled={saving || !form.label.trim()} className="gap-1">
              <Plus className="size-4" />
              {t("settings.colorsAdd")}
            </Button>
          </div>
        </form>

        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void handleReset()}
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          {t("settings.colorsReset")}
        </Button>
      </CardContent>
    </Card>
  );
}
