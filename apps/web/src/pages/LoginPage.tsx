import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PasswordRecoveryLinks } from "@/components/auth/PasswordRecoveryLinks";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("E-posta ve şifre gereklidir.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard/pos", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
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
            <h1 className="text-2xl font-bold">Hesabınıza Giriş Yapın</h1>
            <p className="mt-2 text-muted">
              Lisans ve işletme panelinize erişin
            </p>
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
            <div className="space-y-5">
              <Field label="E-posta" icon={Mail}>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@firma.com"
                  className="field-input"
                />
              </Field>
              <Field label="Şifre" icon={Lock}>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field-input"
                />
              </Field>
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-trust hover:underline"
                >
                  Parolamı unuttum
                </Link>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mint font-semibold text-[#0f3d3a] transition hover:bg-mint/90 disabled:opacity-60"
              >
                {submitting && <Loader2 className="size-5 animate-spin" />}
                {submitting ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <PasswordRecoveryLinks email={email} />
            </div>

            <p className="mt-6 text-center text-sm text-muted">
              Hesabınız yok mu?{" "}
              <Link to="/signup" className="font-semibold text-trust hover:underline">
                Ücretsiz kayıt olun
              </Link>
            </p>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        {children}
      </div>
    </div>
  );
}
