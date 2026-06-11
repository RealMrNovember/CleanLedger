export const TEMPLATE_VARIABLES = [
  "firma_adi",
  "musteri_adi",
  "siparis_no",
  "toplam_tutar",
  "teslim_tarihi",
  "kalemler",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export const DEFAULT_WHATSAPP_TEMPLATES: Record<
  string,
  { name: string; body: string }
> = {
  welcome: {
    name: "Hoşgeldiniz",
    body: "Merhaba {{musteri_adi}}, {{firma_adi}} ailesine hoş geldiniz!",
  },
  order_received: {
    name: "Sipariş Alındı",
    body:
      "{{firma_adi}}\nSipariş No: {{siparis_no}}\nTeslim: {{teslim_tarihi}}\n\n{{kalemler}}\n\nToplam: {{toplam_tutar}}",
  },
  order_ready: {
    name: "Sipariş Hazır",
    body: "Sayın {{musteri_adi}}, siparişiniz ({{siparis_no}}) hazır. {{firma_adi}}",
  },
  delivered: {
    name: "Teslim Edildi",
    body: "Sayın {{musteri_adi}}, siparişiniz ({{siparis_no}}) teslim edildi. {{firma_adi}}",
  },
  debt_reminder: {
    name: "Borç Hatırlatma",
    body: "Sayın {{musteri_adi}}, {{toplam_tutar}} cari bakiyeniz bulunmaktadır. {{firma_adi}}",
  },
};

/** {{degisken}} formatındaki şablonları değerlerle doldurur. */
export function renderTemplate(
  template: string,
  vars: Partial<Record<TemplateVariable, string>>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key as TemplateVariable] ?? "";
  });
}
