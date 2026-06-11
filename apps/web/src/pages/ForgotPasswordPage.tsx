import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PasswordRecoveryLinks } from "@/components/auth/PasswordRecoveryLinks";
import { requestPasswordReset } from "@/lib/auth-api";
import { useI18n } from "@/context/I18nContext";

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError(t("validation.required"));
      return;
    }

    setSubmitting(true);
    try {
      const msg = await requestPasswordReset(email);
      setMessage(msg);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">{t("auth.forgotPassword")}</h1>
            <p className="mt-2 text-muted">{t("auth.loginSubtitle")}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
            {sent ? (
              <div className="space-y-4 text-center">
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {message}
                </p>
                <p className="text-sm text-muted">{t("auth.whatsappSupport")}</p>
                <PasswordRecoveryLinks email={email} />
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-trust hover:underline"
                >
                  <ArrowLeft className="size-4" />
                  {t("auth.loginLink")}
                </Link>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} noValidate>
                {error && (
                  <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink">
                      {t("auth.email")}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("common.emailPlaceholder")}
                        className="field-input"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mint font-semibold text-[#0f3d3a] transition hover:bg-mint/90 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="size-5 animate-spin" />}
                    {submitting ? t("common.saving") : t("auth.forgotPassword")}
                  </button>
                </div>
                <div className="mt-6">
                  <PasswordRecoveryLinks email={email} />
                </div>
                <p className="mt-4 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-trust hover:underline"
                  >
                    <ArrowLeft className="size-4" />
                    {t("auth.loginLink")}
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
