import type { MessageTree } from "./types";
import { trCatalog } from "./tr-catalog";
import { mergeMessages } from "./merge";

export const az: MessageTree = mergeMessages(trCatalog, {
  nav: {
    pos: "Sifariş (POS)",
    orders: "Sifariş izləmə",
    customers: "Müştərilər",
    reports: "Hesabatlar",
    settings: "Parametrlər",
    account: "Hesabım",
  },
  common: {
    logout: "Çıxış",
    search: "Axtar",
    welcome: "Xoş gəldiniz, {{name}} — {{company}}",
    loading: "Yüklənir…",
    save: "Saxla",
    cancel: "Ləğv et",
    collapse: "Yığ",
    expand: "Menunu genişlət",
    closeMenu: "Menunu bağla",
    openMenu: "Menunu aç",
    edit: "Redaktə et",
    delete: "Sil",
    apply: "Tətbiq et",
    reset: "Sıfırla",
    panel: "Panelim",
  },
  auth: {
    loginTitle: "Hesabınıza daxil olun",
    signupTitle: "Pulsuz hesab yaradın",
    login: "Daxil ol",
    signup: "14 gün pulsuz başla",
    signupShort: "Pulsuz qeydiyyat",
    loggingIn: "Daxil olunur…",
    signingUp: "Qeydiyyat…",
    noAccount: "Hesabınız yoxdur?",
    signupLink: "Pulsuz qeydiyyat",
    hasAccount: "Artıq hesabınız var?",
    loginLink: "Daxil olun",
  },
  settings: {
    language: "Dil",
    languageHint: "Varsayılan brauzer dilinizdir; buradan dəyişə bilərsiniz.",
    title: "Parametrlər",
  },
  landing: {
    badge: "Yeni nəsil quru təmizləmə proqramı",
    ctaTrial: "14 gün pulsuz sınayın",
    ctaLogin: "Hesabıma daxil ol",
    featuresTitle: "Niyə CleanLedger?",
  },
});
