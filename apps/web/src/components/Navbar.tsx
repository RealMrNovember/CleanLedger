import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { WebLogo } from "@/components/WebLogo";
import { LanguageSelector } from "@cleanledger/shared/i18n/LanguageSelector";

export function Navbar() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
        <Link to="/">
          <WebLogo />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector
            locale={locale}
            onLocaleChange={setLocale}
            variant="compact"
          />
          {user ? (
            <Link
              to="/dashboard/pos"
              className="rounded-xl bg-mint-light px-4 py-2.5 text-sm font-semibold text-[#0f3d3a]"
            >
              {t("common.panel")}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-slate-100"
              >
                {t("auth.login")}
              </Link>
              <Link
                to="/signup"
                className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-[#0f3d3a] shadow-sm transition hover:bg-mint/90"
              >
                {t("auth.signupShort")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
