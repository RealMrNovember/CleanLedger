import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Mail,
  Lock,
  Phone,
  MapPin,
  User,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-mint to-trust text-white">
              <Sparkles className="size-7" />
            </div>
            <h1 className="text-2xl font-bold">Ücretsiz Hesap Oluşturun</h1>
            <p className="mt-2 text-muted">
              14 günlük deneme sürümü otomatik başlar — kredi kartı gerekmez
            </p>
          </div>

          <form
            className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field icon={Building2} label="Firma Adı" placeholder="Örn: Temiz Dükkan" className="sm:col-span-2" />
              <Field icon={User} label="Yetkili Adı" placeholder="Ad Soyad" />
              <Field icon={Phone} label="Telefon" placeholder="05XX XXX XX XX" type="tel" />
              <Field icon={Mail} label="E-posta" placeholder="ornek@firma.com" type="email" className="sm:col-span-2" />
              <Field icon={MapPin} label="Şehir" placeholder="İstanbul" />
              <Field icon={Lock} label="Şifre" placeholder="••••••••" type="password" />
            </div>

            <button
              type="submit"
              className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-mint to-trust font-semibold text-white shadow-md transition hover:shadow-lg active:scale-[0.99]"
            >
              14 Gün Ücretsiz Başla
            </button>

            <p className="mt-6 text-center text-sm text-muted">
              Zaten hesabınız var mı?{" "}
              <Link to="/login" className="font-semibold text-trust hover:underline">
                Giriş yapın
              </Link>
            </p>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Kayıt işlemi şu an UI önizlemesidir. Tam entegrasyon bir sonraki
            fazda license.cicibyte.com ile bağlanacaktır.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  placeholder,
  type = "text",
  className = "",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type={type}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border-2 border-slate-200 bg-surface pl-11 pr-4 text-sm outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/20"
        />
      </div>
    </div>
  );
}
