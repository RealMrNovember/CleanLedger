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
import { LogoUploadField } from "@/components/settings/LogoUploadField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncStatusPanel } from "@/components/settings/SyncStatusPanel";
import { ThermalPrintSettingsPanel } from "@/components/settings/ThermalPrintSettingsPanel";
import { LanguageSettingsPanel } from "@/components/settings/LanguageSettingsPanel";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/I18nContext";

const THEME_OPTIONS: { value: ThemeMode; labelKey: string }[] = [
  { value: "system", labelKey: "settings.themeSystem" },
  { value: "light", labelKey: "settings.themeLight" },
  { value: "dark", labelKey: "settings.themeDark" },
];

export function GeneralSettingsPanel() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [form, setForm] = useState<ShopProfile>(() => getShopProfile());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(getShopProfile());
  }, [user?.companyName, user?.email, user?.phone]);

  const handleSave = async () => {
    setError("");
    if (!form.companyName.trim()) {
      setError(t("settings.shopNameRequired"));
      return;
    }
    await saveShopProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
    <SyncStatusPanel />
    <Card className="bg-white dark:bg-slate-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Store className="size-5 text-mint" />
          {t("settings.generalTitle")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Moon className="size-4" />
            {t("settings.theme")}
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
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border/60 pt-4">
          <LogoUploadField
            value={form.logoDataUrl}
            onChange={(logoDataUrl) =>
              setForm((f) => ({ ...f, logoDataUrl }))
            }
            label={t("settings.businessLogo")}
            hint={t("settings.pricesHint")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("auth.companyName")}</label>
          <Input
            value={form.companyName}
            onChange={(e) =>
              setForm((f) => ({ ...f, companyName: e.target.value }))
            }
            placeholder={t("auth.companyName")}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("common.phone")}</label>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder={t("common.phonePlaceholder")}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("auth.email")}</label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder={t("common.emailPlaceholder")}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("common.address")}</label>
          <Input
            value={form.address ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
            placeholder={t("customers.formAddressPlaceholder")}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && (
          <p className="text-sm font-medium text-mint">{t("settings.savedReceiptsUpdated")}</p>
        )}
        <Button onClick={handleSave}>{t("common.save")}</Button>
      </CardContent>
    </Card>
    <LanguageSettingsPanel />
    <ThermalPrintSettingsPanel />
    </div>
  );
}
