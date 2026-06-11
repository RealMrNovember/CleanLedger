import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PasswordRecoveryLinks } from "@/components/auth/PasswordRecoveryLinks";
import { requestPasswordReset } from "@/lib/auth-api";
import { useI18n } from "@/context/I18nContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ForgotPasswordScreen() {
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
    <div className="login-screen relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f14]">
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
            <Logo size="lg" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white">
              {t("auth.forgotPassword")}
            </h1>
            <p className="mt-1 text-sm text-slate-200">{t("auth.loginSubtitle")}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-100">
                {message}
              </p>
              <PasswordRecoveryLinks email={email} />
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#7dd3fc] hover:underline"
              >
                <ArrowLeft className="size-4" />
                {t("auth.loginLink")}
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              {error && (
                <p className="mb-4 rounded-xl border border-red-400/40 bg-red-950/60 px-3 py-2 text-sm text-red-100">
                  {error}
                </p>
              )}
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-100">
                    {t("auth.email")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-300" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("common.emailPlaceholder")}
                      className="h-12 border-white/30 bg-white/15 pl-11 text-white placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-[#0f3d3a] to-[#2d6a4f] text-base font-semibold text-white"
                >
                  {submitting && <Loader2 className="size-5 animate-spin" />}
                  {submitting ? t("common.saving") : t("auth.forgotPassword")}
                </Button>
              </div>
              <div className="mt-6">
                <PasswordRecoveryLinks email={email} />
              </div>
              <p className="mt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#7dd3fc] hover:underline"
                >
                  <ArrowLeft className="size-4" />
                  {t("auth.loginLink")}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
