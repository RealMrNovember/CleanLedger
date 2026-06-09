import { Link } from "react-router-dom";
import { Mail, Lock, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-mint to-trust text-white">
              <Sparkles className="size-7" />
            </div>
            <h1 className="text-2xl font-bold">Hesabınıza Giriş Yapın</h1>
            <p className="mt-2 text-muted">
              Lisans ve işletme panelinize erişin
            </p>
          </div>

          <form
            className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  E-posta
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    placeholder="ornek@firma.com"
                    className="h-12 w-full rounded-xl border-2 border-slate-200 bg-surface pl-12 pr-4 outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border-2 border-slate-200 bg-surface pl-12 pr-4 outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-mint font-semibold text-[#0f3d3a] transition hover:bg-mint/90"
              >
                Giriş Yap
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-muted">
              Hesabınız yok mu?{" "}
              <Link to="/signup" className="font-semibold text-trust hover:underline">
                Ücretsiz kayıt olun
              </Link>
            </p>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Bu portal yakında aktif olacaktır. Şimdilik masaüstü uygulamasından
            kayıt olabilirsiniz.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
