import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Mail,
  Lock,
  Phone,
  MapPin,
  User,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PasswordRecoveryLinks } from "@/components/auth/PasswordRecoveryLinks";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { t, formatError } = useI18n();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    phone: "",
    email: "",
    city: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !form.companyName.trim() ||
      !form.ownerName.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      setError(t("auth.requiredFields"));
      return;
    }

    setSubmitting(true);
    try {
      await signup(form);
      navigate("/dashboard/pos", { replace: true });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">{t("auth.signupTitle")}</h1>
            <p className="mt-2 text-muted">{t("auth.signupSubtitle")}</p>
          </div>

          <form
            className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm"
            onSubmit={(e) => void handleSubmit(e)}
            noValidate
          >
            {error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <InputField
                icon={Building2}
                label={t("auth.companyName")}
                required
                value={form.companyName}
                onChange={(v) => update("companyName", v)}
                placeholder={t("auth.companyNamePlaceholder")}
                className="sm:col-span-2"
              />
              <InputField
                icon={User}
                label={t("auth.ownerName")}
                required
                value={form.ownerName}
                onChange={(v) => update("ownerName", v)}
                placeholder={t("auth.ownerNamePlaceholder")}
              />
              <InputField
                icon={Phone}
                label={t("auth.phone")}
                required
                type="tel"
                value={form.phone}
                onChange={(v) => update("phone", v)}
                placeholder={t("common.phonePlaceholder")}
              />
              <InputField
                icon={Mail}
                label={t("auth.email")}
                required
                type="email"
                name="email"
                autoComplete="username"
                value={form.email}
                onChange={(v) => update("email", v)}
                placeholder={t("common.emailPlaceholder")}
                className="sm:col-span-2"
              />
              <InputField
                icon={Lock}
                label={t("auth.password")}
                required
                type="password"
                name="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(v) => update("password", v)}
                placeholder={t("common.passwordPlaceholder")}
                className="sm:col-span-2"
              />
              <InputField
                icon={MapPin}
                label={t("auth.city")}
                name="city"
                autoComplete="address-level2"
                value={form.city}
                onChange={(v) => update("city", v)}
                placeholder={t("auth.cityPlaceholder")}
                className="sm:col-span-2"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-mint to-trust font-semibold text-white shadow-md transition hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
            >
              {submitting && <Loader2 className="size-5 animate-spin" />}
              {submitting ? t("auth.signingUp") : t("auth.signup")}
            </button>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <PasswordRecoveryLinks email={form.email} />
            </div>

            <p className="mt-6 text-center text-sm text-muted">
              {t("auth.hasAccount")}{" "}
              <Link to="/login" className="font-semibold text-trust hover:underline">
                {t("auth.loginLink")}
              </Link>
            </p>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InputField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  name,
  autoComplete,
  required,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type={type}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border-2 border-slate-200 bg-surface pl-11 pr-4 text-sm outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/20"
        />
      </div>
    </div>
  );
}
