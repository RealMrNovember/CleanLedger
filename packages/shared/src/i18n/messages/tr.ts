import type { MessageTree } from "./en";

export const tr: MessageTree = {
  nav: {
    pos: "Sipariş (POS)",
    orders: "Sipariş Takibi",
    customers: "Müşteriler",
    reports: "Raporlar",
    settings: "Ayarlar",
    account: "Hesabım",
  },
  common: {
    logout: "Çıkış Yap",
    search: "Ara",
    welcome: "Hoş Geldiniz, {{name}} — {{company}}",
    loading: "Yükleniyor…",
    save: "Kaydet",
    cancel: "İptal",
    collapse: "Daralt",
  },
  auth: {
    loginTitle: "Hesabınıza Giriş Yapın",
    loginSubtitle: "Lisans ve işletme panelinize erişin",
    signupTitle: "Ücretsiz Hesap Oluşturun",
    signupSubtitle:
      "14 günlük deneme sürümü otomatik başlar — kredi kartı gerekmez",
    email: "E-posta",
    password: "Şifre",
    city: "Şehir",
    companyName: "Firma Adı",
    ownerName: "Yetkili Adı",
    phone: "Telefon",
    login: "Giriş Yap",
    signup: "14 Gün Ücretsiz Başla",
    loggingIn: "Giriş yapılıyor…",
    signingUp: "Kaydediliyor…",
  },
  settings: {
    language: "Dil",
    languageHint:
      "Varsayılan tarayıcı dilinizdir; buradan değiştirebilirsiniz.",
  },
};
