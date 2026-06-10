import { useEffect, useState } from "react";
import { Store, Moon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import {
  getShopProfile,
  saveShopProfile,
  type ShopProfile,
} from "@/lib/shop-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "Sistem" },
  { value: "light", label: "Açık" },
  { value: "dark", label: "Koyu" },
];

export function GeneralSettingsPanel() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState<ShopProfile>(() => getShopProfile());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(getShopProfile());
  }, [user?.companyName, user?.email, user?.phone]);

  const handleSave = () => {
    setError("");
    if (!form.companyName.trim()) {
      setError("Dükkan adı zorunludur.");
      return;
    }
    saveShopProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Card className="mx-auto max-w-xl bg-white dark:bg-slate-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Store className="size-5 text-mint" />
          Genel — Dükkan Bilgileri
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Bu bilgiler fişin en üstünde ve müşteri mesajlarında kullanılır.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Moon className="size-4" />
            Görünüm Modu
          </label>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                  theme === opt.value
                    ? "border-mint bg-mint-light text-[#0f3d3a] dark:bg-teal-900 dark:text-teal-100"
                    : "border-border/60 hover:border-mint/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border/60 pt-4">
          <label className="mb-1 block text-sm font-medium">Dükkan Adı</label>
          <Input
            value={form.companyName}
            onChange={(e) =>
              setForm((f) => ({ ...f, companyName: e.target.value }))
            }
            placeholder="Örn: Cicibyte Kuru Temizleme"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Telefon</label>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="05XX XXX XX XX"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">E-posta</label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="info@dukkan.com"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && (
          <p className="text-sm font-medium text-mint">Kaydedildi — fişler güncellendi.</p>
        )}
        <Button onClick={handleSave}>Kaydet</Button>
      </CardContent>
    </Card>
  );
}
