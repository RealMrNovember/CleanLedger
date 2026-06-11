import { WHATSAPP_SUPPORT_URL } from "../whatsapp";

export const PASSWORD_RESET_MIN_LENGTH = 8;
export const PASSWORD_CHANGE_MIN_LENGTH = 6;

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "Kayıtlı bir hesabınız varsa sıfırlama bağlantısı e-posta adresinize gönderildi.";

export function validateResetPassword(password: string): string | null {
  if (password.length < PASSWORD_RESET_MIN_LENGTH) {
    return `Parola en az ${PASSWORD_RESET_MIN_LENGTH} karakter olmalı.`;
  }
  return null;
}

export function buildPasswordResetWhatsAppUrl(email: string): string {
  const text = encodeURIComponent(
    `Merhaba, CleanLedger hesabım (${email}) için parola sıfırlama desteği rica ediyorum.`
  );
  return `${WHATSAPP_SUPPORT_URL}?text=${text}`;
}

export function buildSignupSupportWhatsAppUrl(email: string): string {
  const text = encodeURIComponent(
    `Merhaba, CleanLedger hesabı oluşturdum (${email}) ancak giriş yapamıyorum. Yardım rica ediyorum.`
  );
  return `${WHATSAPP_SUPPORT_URL}?text=${text}`;
}
