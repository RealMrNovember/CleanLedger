import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getShopProfile,
  saveShopProfile,
  type ShopProfile,
} from "@/lib/shop-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GeneralSettingsPanel() {
  const { user } = useAuth();
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
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="size-5 text-mint" />
          Genel — Dükkan Bilgileri
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Bu bilgiler fişin en üstünde ve müşteri mesajlarında kullanılır.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
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
