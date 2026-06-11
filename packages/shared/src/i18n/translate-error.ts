import { isAppError, type ErrorCode } from "../errors/app-error";
import type { TranslateFn } from "./labels";

function errorCodeToKey(code: ErrorCode): string {
  const camel = code
    .toLowerCase()
    .split("_")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
  return `errors.${camel}`;
}

/** Maps legacy Turkish/English thrown messages to catalog keys. */
const LEGACY_MESSAGE_KEYS: Record<string, string> = {
  "Müşteri bulunamadı": "errors.customerNotFound",
  "Sıfırlanacak cari bakiyesi yok.": "errors.noCreditBalance",
  "Geri alınacak sıfırlama kaydı yok.": "errors.noCreditReset",
  "Bu müşterinin işlem geçmişi olduğu için silinemez. Tüm ziyaret ve sipariş kayıtları kalıcı olarak saklanır.":
    "errors.customerHasOrders",
  "Sipariş bulunamadı": "errors.orderNotFound",
  "Sipariş bulunamadı.": "errors.orderNotFound",
  "Ödenecek tutar yok": "errors.noAmountDue",
  "Teslimatta ödeme için tahsilat bilgisi gerekli.":
    "errors.deliveryPaymentRequired",
  "Ödeme kaydı bulunamadı": "errors.paymentNotFound",
  "Varsayılan etiketler silinemez.": "errors.defaultTagsLocked",
  "Şablon bulunamadı": "errors.templateNotFound",
  "Bu ürün geçmiş siparişlerde kullanıldığı için silinemez.":
    "errors.productInUse",
  "Oturum bulunamadı.": "errors.sessionNotFound",
  "Oturum bulunamadı. Lütfen tekrar giriş yapın.": "errors.sessionRequired",
  "Bu e-posta zaten kayıtlı.": "errors.emailExists",
  "E-posta veya şifre hatalı.": "errors.wrongCredentials",
  "Kayıt başarısız. Lütfen tekrar deneyin.": "errors.signupFailed",
  "Geçersiz oturum.": "errors.invalidSession",
  "Hesap bulunamadı. Sunucu üzerinden kayıt olduysanız tekrar deneyin.":
    "errors.accountNotFound",
  "Mevcut şifre hatalı.": "errors.wrongCurrentPassword",
  "Mevcut ve yeni şifre gerekli.": "errors.passwordsRequired",
  "Yeni şifre en az 6 karakter olmalı.": "errors.passwordTooShort",
  "Yeni şifre mevcut şifreden farklı olmalı.": "errors.passwordUnchanged",
  "Giriş başarısız.": "errors.loginFailed",
  "İstek başarısız.": "errors.authRequestFailed",
  "Lisans sunucusu boş yanıt döndü.": "errors.licenseEmptyResponse",
  "Lisans doğrulanamadı.": "errors.licenseVerifyFailed",
  "Yazdırma çerçevesi oluşturulamadı.": "errors.printFrameFailed",
  "Yazdırma penceresi açılamadı. Pop-up engelleyicisini kontrol edin.":
    "errors.printPopupBlocked",
  "Veritabanı erişimi için oturum açık olmalıdır.": "errors.dbSessionRequired",
};

export interface AuthApiErrorLike {
  code?: string;
  message: string;
}

const AUTH_API_CODE_KEYS: Record<string, string> = {
  NETWORK_ERROR: "errors.authNetwork",
  WRONG_PASSWORD: "errors.wrongCredentials",
  USER_NOT_FOUND: "errors.wrongCredentials",
  MISSING_FIELDS: "errors.passwordsRequired",
  PASSWORD_HASH_MISSING: "errors.wrongCredentials",
  EMAIL_EXISTS: "errors.emailExists",
};

export function translateAppError(t: TranslateFn, err: unknown): string {
  if (isAppError(err)) {
    const key = errorCodeToKey(err.code);
    const translated = t(key);
    if (translated !== key) return translated;
  }

  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as AuthApiErrorLike).code === "string"
  ) {
    const apiErr = err as AuthApiErrorLike;
    const mapped = AUTH_API_CODE_KEYS[apiErr.code ?? ""];
    if (mapped) {
      const translated = t(mapped);
      if (translated !== mapped) return translated;
    }
  }

  if (err instanceof Error) {
    const legacyKey = LEGACY_MESSAGE_KEYS[err.message];
    if (legacyKey) {
      const translated = t(legacyKey);
      if (translated !== legacyKey) return translated;
    }
    if (err.message.startsWith("Auth API'ye ulaşılamadı:")) {
      return t("errors.authNetwork");
    }
    if (err.message.startsWith("Lisans sunucusu hatası")) {
      return t("errors.licenseServer", { status: err.message.replace(/\D/g, "") || "?" });
    }
    if (err.message.trim()) return err.message;
  }

  return t("errors.generic");
}
