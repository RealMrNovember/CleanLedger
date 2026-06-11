import { useState } from "react";
import { Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getThermalWidthProfile,
  setThermalWidthProfile,
  type ThermalWidthProfile,
} from "@/lib/thermal-settings";
import { useI18n } from "@/context/I18nContext";

export function ThermalPrintSettingsPanel() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<ThermalWidthProfile>(
    getThermalWidthProfile()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="size-5 text-trust" />
          {t("settings.thermalTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("settings.thermalHint")}</p>
        <div className="flex flex-wrap gap-2">
          {(["58", "80"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setThermalWidthProfile(value);
                setProfile(value);
              }}
              className={
                profile === value
                  ? "rounded-xl border-2 border-mint bg-mint-light/40 px-4 py-2 text-sm font-semibold text-[#0f3d3a]"
                  : "rounded-xl border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
              }
            >
              {t("settings.thermalWidthMm", { width: value })}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("settings.thermalWebSerialHint")}
        </p>
      </CardContent>
    </Card>
  );
}
