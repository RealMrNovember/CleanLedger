import { useState } from "react";
import { Lock, LogOut, MessageCircle, RefreshCw } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { CICIBYTE_URL } from "@/lib/constants";
import { WHATSAPP_SUPPORT_URL } from "@/lib/whatsapp";
import { useI18n } from "@/context/I18nContext";

interface LicenseLockedScreenProps {
  companyName?: string;
  lockReason?: string | null;
  onRetry: () => Promise<void>;
  onLogout: () => void;
}

export function LicenseLockedScreen({
  companyName,
  lockReason,
  onRetry,
  onLogout,
}: LicenseLockedScreenProps) {
  const { t } = useI18n();
  const [retrying, setRetrying] = useState(false);

  const whatsappMessage = encodeURIComponent(
    `Merhaba, ${companyName ? `${companyName} (` : ""}CleanLedger lisansımı yenilemek istiyorum.${companyName ? ")" : ""}`
  );

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0f14] px-6 py-12 text-white">
      <Logo size="md" className="mb-8" />
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-500/15 text-red-300">
          <Lock className="size-7" />
        </div>
        <h1 className="text-2xl font-bold">{t("license.lockedTitle")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {lockReason ?? t("license.lockedDefaultReason")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={`${WHATSAPP_SUPPORT_URL}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <MessageCircle className="size-4" />
            {t("license.whatsappContact")}
          </a>
          <a
            href={CICIBYTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            cicibyte.com
          </a>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={retrying}
            onClick={() => void handleRetry()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-mint/40 px-4 py-2.5 text-sm font-medium text-mint transition hover:bg-mint/10 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? t("license.checking") : t("license.recheck")}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" />
            {t("common.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
