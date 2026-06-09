import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-trust text-white shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">CleanLedger</p>
            <p className="text-xs text-muted">Cicibyte</p>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-slate-100"
          >
            Giriş Yap
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-[#0f3d3a] shadow-sm transition hover:bg-mint/90"
          >
            Ücretsiz Kayıt Ol
          </Link>
        </nav>
      </div>
    </header>
  );
}
