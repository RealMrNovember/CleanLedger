import { Languages } from "lucide-react";
import type { Locale } from "@cleanledger/shared/i18n";
import { useI18n } from "@/context/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LanguageSettingsPanel() {
  const { locale, setLocale, locales, localeLabels, t } = useI18n();

  return (
    <Card className="bg-white dark:bg-slate-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Languages className="size-5 text-mint" />
          {t("settings.language")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.languageHint")}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {locales.map((code: Locale) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                locale === code
                  ? "border-mint bg-mint/10 text-foreground"
                  : "border-border/60 hover:border-mint/40"
              }`}
            >
              {localeLabels[code]}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
