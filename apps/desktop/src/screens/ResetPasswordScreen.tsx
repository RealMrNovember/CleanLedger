import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { validateResetPassword } from "@cleanledger/shared";
import { Logo } from "@/components/brand/Logo";
import { PasswordRecoveryLinks } from "@/components/auth/PasswordRecoveryLinks";
import { resetPassword, validateResetToken } from "@/lib/auth-api";
import { useI18n } from "@/context/I18nContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ResetPasswordScreen() {
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
      setError(t("validation.invalidAmount"));
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
    <div className="login-screen relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f14]">
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
            <Logo size="lg" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white">{t("auth.password")}</h1>
            <p className="mt-1 text-sm text-slate-200">{t("validation.required")}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          {tokenValid === null && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-8 animate-spin text-mint" />
            </div>
          )}

          {tokenValid === false && (
            <div className="space-y-4 text-center">
              <p className="rounded-xl border border-red-400/40 bg-red-950/60 px-3 py-2 text-sm text-red-100">
                {t("auth.loginFailed")}
              </p>
              <Link
                to="/forgot-password"
                className="font-semibold text-[#7dd3fc] hover:underline"
              >
                {t("auth.forgotPassword")}
              </Link>
              <PasswordRecoveryLinks />
            </div>
          )}

          {tokenValid === true && success && (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-950/50 px-3 py-2 text-center text-sm text-emerald-100">
              {t("auth.loginLink")}
            </p>
          )}

          {tokenValid === true && !success && (
            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              {error && (
                <p className="mb-4 rounded-xl border border-red-400/40 bg-red-950/60 px-3 py-2 text-sm text-red-100">
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
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-[#0f3d3a] to-[#2d6a4f] text-base font-semibold text-white"
                >
                  {submitting && <Loader2 className="size-5 animate-spin" />}
                  {submitting ? t("common.saving") : t("common.save")}
                </Button>
              </div>
              <p className="mt-6 text-center">
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
      <label className="mb-2 block text-sm font-medium text-slate-100">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-300" />
        <Input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 border-white/30 bg-white/15 pl-11 text-white placeholder:text-slate-400"
          minLength={8}
        />
      </div>
    </div>
  );
}
