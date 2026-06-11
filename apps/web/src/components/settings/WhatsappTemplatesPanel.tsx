import { useCallback, useEffect, useState } from "react";
import type { WhatsappTemplate } from "@/db/schema";
import { getWhatsappTemplates, updateWhatsappTemplate } from "@/db/client";
import { TEMPLATE_VARIABLES } from "@cleanledger/shared/templates";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WhatsappTemplatesPanel() {
  const { t } = useI18n();
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const rows = await getWhatsappTemplates();
    setTemplates(rows);
    setDrafts(Object.fromEntries(rows.map((t) => [t.id, t.body])));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (template: WhatsappTemplate) => {
    const body = drafts[template.id] ?? template.body;
    setSavingId(template.id);
    setMessage("");
    try {
      await updateWhatsappTemplate(template.id, { body });
      await load();
      setMessage(t("settings.templateSaved", { name: template.name }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("settings.saveFailed"));
    } finally {
      setSavingId(null);
    }
  };

  const handleToggle = async (template: WhatsappTemplate) => {
    setSavingId(template.id);
    setMessage("");
    try {
      await updateWhatsappTemplate(template.id, {
        active: template.active ? 0 : 1,
      });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>{t("settings.whatsappTemplatesTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.whatsappHint")}</p>
        <p className="text-xs text-muted-foreground">
          {t("settings.whatsappVariables")}{" "}
          {TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(", ")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <p className="rounded-xl bg-mint-light/40 px-3 py-2 text-sm text-[#0f3d3a]">
            {message}
          </p>
        )}
        {templates.map((template) => (
          <div
            key={template.id}
            className="space-y-3 rounded-2xl border border-border/60 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.slug}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={template.active ? "default" : "outline"}
                disabled={savingId === template.id}
                onClick={() => void handleToggle(template)}
              >
                {template.active ? t("settings.active") : t("settings.inactive")}
              </Button>
            </div>
            <textarea
              value={drafts[template.id] ?? template.body}
              onChange={(e) =>
                setDrafts((prev) => ({ ...prev, [template.id]: e.target.value }))
              }
              rows={6}
              className="w-full rounded-xl border-2 border-input px-4 py-3 font-mono text-sm"
            />
            <Button
              type="button"
              disabled={savingId === template.id}
              onClick={() => void handleSave(template)}
            >
              {savingId === template.id ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
