import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import {
  buildPasswordResetWhatsAppUrl,
  WHATSAPP_SUPPORT_URL,
} from "@cleanledger/shared";
import { useI18n } from "@/context/I18nContext";

interface PasswordRecoveryLinksProps {
  email?: string;
  className?: string;
}

export function PasswordRecoveryLinks({
  email = "",
  className = "",
}: PasswordRecoveryLinksProps) {
  const { t } = useI18n();
  const whatsappHref =
    email.trim() !== ""
      ? buildPasswordResetWhatsAppUrl(email.trim())
      : `${WHATSAPP_SUPPORT_URL}?text=${encodeURIComponent(t("auth.whatsappDefaultMessage"))}`;

  return (
    <div className={`space-y-3 text-center text-sm ${className}`}>
      <p>
        <Link
          to="/forgot-password"
          className="font-semibold text-[#7dd3fc] hover:text-white hover:underline"
        >
          {t("auth.forgotPassword")}
        </Link>
      </p>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-4 py-2 font-medium text-emerald-100 transition hover:bg-emerald-900/50"
      >
        <MessageCircle className="size-4" />
        {t("auth.whatsappSupport")}
      </a>
    </div>
  );
}
