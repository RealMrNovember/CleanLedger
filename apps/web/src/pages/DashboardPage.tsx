import { Link, useNavigate } from "react-router-dom";
import { LogOut, Sparkles, Calendar } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { DownloadButton } from "@/components/DownloadButton";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) return null;

  const trialEnd = new Date(user.trialEndsAt).toLocaleDateString("tr-TR");

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-mint to-trust text-white">
            <Sparkles className="size-8" />
          </div>
          <h1 className="text-3xl font-bold">Hoş Geldiniz!</h1>
          <p className="mt-2 text-muted">
            {user.companyName} hesabınız başarıyla oluşturuldu.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Firma" value={user.companyName} />
            <Info label="Yetkili" value={user.ownerName} />
            <Info label="E-posta" value={user.email} />
            <Info label="Telefon" value={user.phone || "—"} />
            <Info label="Şehir" value={user.city || "—"} />
            <div className="rounded-xl bg-mint-light/50 p-4">
              <p className="text-xs font-medium text-[#0f5f57]">Deneme Süresi</p>
              <p className="mt-1 flex items-center gap-2 font-semibold">
                <Calendar className="size-4 text-mint" />
                {trialEnd} tarihine kadar
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <p className="mb-4 text-sm text-muted">
              Masaüstü uygulamasını indirip aynı e-posta ile giriş yaparak
              sipariş almaya başlayın.
            </p>
            <DownloadButton variant="secondary" />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm text-muted transition hover:bg-slate-50"
          >
            <LogOut className="size-4" />
            Çıkış Yap
          </button>
        </div>

        <p className="mt-6 text-center">
          <Link to="/" className="text-sm text-trust hover:underline">
            Ana sayfaya dön
          </Link>
        </p>
      </main>

      <Footer />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
