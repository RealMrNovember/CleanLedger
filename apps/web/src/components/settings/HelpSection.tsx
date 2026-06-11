import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Sparkles, MessageCircle } from "lucide-react";
import { WHATSAPP_SUPPORT_URL } from "@/lib/whatsapp";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function HelpSection() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const guideItems = useMemo(
    () => [
      { title: t("settings.helpOrderTitle"), content: t("settings.helpOrderContent") },
      { title: t("settings.helpPricesTitle"), content: t("settings.helpPricesContent") },
      { title: t("settings.helpAddressTitle"), content: t("settings.helpAddressContent") },
      { title: t("settings.helpHistoryTitle"), content: t("settings.helpHistoryContent") },
      { title: t("settings.helpOfflineTitle"), content: t("settings.helpOfflineContent") },
    ],
    [t]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden border-[#25D366]/40 bg-gradient-to-br from-[#25D366]/10 to-[#128C7E]/5">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg">
            <MessageCircle className="size-9" fill="currentColor" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{t("settings.helpWhatsappTitle")}</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t("settings.helpWhatsappDesc")}
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="h-14 gap-3 bg-[#25D366] px-8 text-base font-bold text-white hover:bg-[#1ebe57]"
          >
            <a
              href={WHATSAPP_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-6" fill="currentColor" />
              {t("settings.helpWhatsappButton")}
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">+90 535 489 50 50</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-mint/30 bg-gradient-to-br from-mint-light/40 to-trust-light/30">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white shadow-sm">
              <Sparkles className="size-6 text-mint" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("settings.helpMaker")}
              </p>
              <p className="text-xl font-bold">Cicibyte Corp.</p>
              <a
                href="https://www.cicibyte.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-trust hover:underline"
              >
                www.cicibyte.com
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t("settings.helpMakerVisit")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.helpGuideTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {guideItems.map((item, index) => (
            <div
              key={item.title}
              className="overflow-hidden rounded-xl border border-border/60"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-4 py-3 text-left font-medium transition hover:bg-muted/50"
              >
                {item.title}
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 text-muted-foreground transition",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="border-t border-border/60 bg-muted/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                  {item.content}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
