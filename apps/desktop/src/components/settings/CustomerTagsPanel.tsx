import { useCallback, useEffect, useState } from "react";
import type { CustomerTag, TagColor } from "@/db/schema";
import { TAG_COLOR_CLASSES } from "@/db/schema";
import {
  getCustomerTags,
  createCustomerTag,
  updateCustomerTag,
  deleteCustomerTag,
} from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS: { value: TagColor; label: string }[] = [
  { value: "slate", label: "Gri" },
  { value: "yellow", label: "Sarı" },
  { value: "gold", label: "Altın" },
  { value: "red", label: "Kırmızı" },
  { value: "mint", label: "Yeşil" },
  { value: "trust", label: "Mavi" },
];

export function CustomerTagsPanel() {
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ slug: "", label: "", color: "slate" as TagColor });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setTags(await getCustomerTags());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ slug: "", label: "", color: "slate" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      const slug =
        form.slug.trim() ||
        form.label.trim().toLowerCase().replace(/\s+/g, "-");
      if (editingId) {
        await updateCustomerTag(editingId, { ...form, slug });
      } else {
        await createCustomerTag({ ...form, slug });
      }
      resetForm();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tag: CustomerTag) => {
    setEditingId(tag.id);
    setForm({
      slug: tag.slug,
      label: tag.label,
      color: tag.color as TagColor,
    });
  };

  const handleDelete = async (tag: CustomerTag) => {
    if (!confirm(`"${tag.label}" etiketini silmek istiyor musunuz?`)) return;
    try {
      await deleteCustomerTag(tag.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinemedi.");
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Müşteri Etiketleri</CardTitle>
        <p className="text-sm text-muted-foreground">
          POS ve müşteri listesinde görünen renkli etiketleri yönetin.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-xl border border-border/60 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Etiket Adı</label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Örn: VIP"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Kod (slug)</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="vip"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Renk</label>
              <select
                value={form.color}
                onChange={(e) =>
                  setForm({ ...form, color: e.target.value as TagColor })
                }
                className="h-11 w-full rounded-xl border-2 border-input bg-card px-3 text-sm"
              >
                {COLOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {editingId ? "Güncelle" : "Etiket Ekle"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                İptal
              </Button>
            )}
          </div>
        </form>

        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold",
                    TAG_COLOR_CLASSES[tag.color as TagColor]
                  )}
                >
                  {tag.label}
                </span>
                <span className="text-sm text-muted-foreground">{tag.slug}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(tag)}>
                  Düzenle
                </Button>
                {tag.id > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void handleDelete(tag)}
                  >
                    Sil
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
