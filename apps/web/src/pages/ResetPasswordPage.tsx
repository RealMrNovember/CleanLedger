import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { validateResetPassword } from "@cleanledger/shared";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PasswordRecoveryLinks } from "@/components/auth/PasswordRecoveryLinks";
import { resetPassword, validateResetToken } from "@/lib/auth-api";
import { useI18n } from "@/context/I18nContext";

export function ResetPasswordPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    let cancelled = false;
    void validateResetToken(token).then((valid) => {
      if (!cancelled) setTokenValid(valid);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const policyError = validateResetPassword(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password !== confirm) {
      setError(t("validation.required"));
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
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
            <h1 className="text-2xl font-bold">{t("auth.password")}</h1>
            <p className="mt-2 text-muted">{t("validation.required")}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
            {tokenValid === null && (
              <div className="flex justify-center py-8">
                <Loader2 className="size-8 animate-spin text-mint" />
              </div>
            )}

            {tokenValid === false && (
              <div className="space-y-4 text-center">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {t("validation.invalidEmail")}
                </p>
                <Link
                  to="/forgot-password"
                  className="font-semibold text-trust hover:underline"
                >
                  {t("auth.forgotPassword")}
                </Link>
                <PasswordRecoveryLinks />
              </div>
            )}

            {tokenValid === true && success && (
              <div className="space-y-4 text-center">
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {t("settings.savedReceiptsUpdated")}
                </p>
              </div>
            )}

            {tokenValid === true && !success && (
              <form onSubmit={(e) => void handleSubmit(e)} noValidate>
                {error && (
                  <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                <div className="space-y-5">
                  <PasswordField
                    label={t("auth.password")}
                    value={password}
                    onChange={setPassword}
                    placeholder={t("common.passwordPlaceholder")}
                  />
                  <PasswordField
                    label={t("auth.password")}
                    value={confirm}
                    onChange={setConfirm}
                    placeholder={t("common.passwordPlaceholder")}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mint font-semibold text-[#0f3d3a] transition hover:bg-mint/90 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="size-5 animate-spin" />}
                    {submitting ? t("common.saving") : t("common.save")}
                  </button>
                </div>
                <p className="mt-6 text-center">
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

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="field-input"
          minLength={8}
        />
      </div>
    </div>
  );
}
