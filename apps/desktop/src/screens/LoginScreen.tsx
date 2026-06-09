import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, ExternalLink } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/context/AuthContext";
import { appConfig } from "@/lib/config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f14]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40 blur-2xl"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0f3d3a 0%, #1a5c56 35%, #2d6a4f 60%, #40916c 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_65%)]" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
            <Logo size="lg" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              CleanLedger
            </h1>
            <p className="mt-1 text-sm text-slate-100">
              Kuru temizleme yönetim sisteminize giriş yapın
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
          noValidate
        >
          {error && (
            <p className="mb-4 rounded-xl border border-red-400/40 bg-red-950/60 px-3 py-2 text-sm font-medium text-red-100">
              {error}
            </p>
          )}

          <div className="space-y-5">
            <Field label="E-posta" icon={Mail}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@firma.com"
                className="h-12 border-white/30 bg-white/15 pl-11 text-base text-white placeholder:text-slate-400 focus-visible:border-mint focus-visible:ring-mint/40"
                autoFocus
              />
            </Field>

            <Field label="Şifre" icon={Lock}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 border-white/30 bg-white/15 pl-11 text-base text-white placeholder:text-slate-400 focus-visible:border-mint focus-visible:ring-mint/40"
              />
            </Field>

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-[#0f3d3a] to-[#2d6a4f] text-base font-semibold text-white shadow-lg hover:opacity-95"
            >
              {submitting && <Loader2 className="size-5 animate-spin" />}
              {submitting ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-200">
            Hesabınız yok mu?{" "}
            <a
              href={`${appConfig.webAppUrl}/#/signup`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#7dd3fc] hover:text-white hover:underline"
            >
              Web sitesinden kayıt olun
              <ExternalLink className="size-3" />
            </a>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-300">
          Cicibyte Corp · Quiet Luxury Edition
        </p>
      </div>
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
      <label className="mb-2 block text-sm font-medium text-slate-100">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-300" />
        {children}
      </div>
    </div>
  );
}
