import {
  WifiOff,
  Shirt,
  Sparkles,
  Shield,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DownloadButton } from "@/components/DownloadButton";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/context/I18nContext";

export function LandingPage() {
  const { t } = useI18n();

  const features: { icon: LucideIcon; title: string; desc: string }[] = [
    {
      icon: Shirt,
      title: t("landing.feature1Title"),
      desc: t("landing.feature1Desc"),
    },
    {
      icon: WifiOff,
      title: t("landing.feature2Title"),
      desc: t("landing.feature2Desc"),
    },
    {
      icon: Shield,
      title: t("landing.feature3Title"),
      desc: t("landing.feature3Desc"),
    },
    {
      icon: Clock,
      title: t("landing.feature4Title"),
      desc: t("landing.feature4Desc"),
    },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-mint-light)_0%,_transparent_55%)]" />
        <div className="pointer-events-none absolute -right-32 top-20 size-96 rounded-full bg-trust-light/60 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 text-center md:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint-light/50 px-4 py-1.5 text-sm font-medium text-[#0f5f57]">
            <Sparkles className="size-4 text-mint" />
            {t("landing.badge")}
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            {t("landing.heroTitle")}{" "}
            <span className="bg-gradient-to-r from-mint to-trust bg-clip-text text-transparent">
              {t("landing.heroHighlight")}
            </span>
            {t("landing.heroTitleEnd") ? ` ${t("landing.heroTitleEnd")}` : ""}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl">
            {t("landing.heroSubtitle")}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <DownloadButton />
            <Link
              to="/signup"
              className="inline-flex h-16 items-center rounded-2xl border-2 border-slate-200 bg-white px-10 text-lg font-semibold text-ink transition hover:border-mint/40 hover:bg-mint-light/30"
            >
              {t("landing.ctaTrial")}
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted">{t("landing.platformNote")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold">{t("landing.featuresTitle")}</h2>
          <p className="mt-3 text-muted">{t("landing.featuresSubtitle")}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-mint/30 hover:shadow-md"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-trust-light text-trust">
                <f.icon className="size-6" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-[#0f3d3a] to-[#1a5f6f] p-10 text-center text-white md:p-16">
          <h2 className="text-3xl font-bold md:text-4xl">{t("landing.ctaTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            {t("landing.ctaSubtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <DownloadButton variant="secondary" />
            <Link
              to="/login"
              className="inline-flex h-14 items-center rounded-2xl border border-white/30 px-8 font-semibold text-white transition hover:bg-white/10"
            >
              {t("landing.ctaLogin")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
