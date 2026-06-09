import { CICIBYTE_URL } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} CleanLedger —{" "}
          <a
            href={CICIBYTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-trust hover:underline"
          >
            Cicibyte Corp.
          </a>
        </p>
        <p className="text-sm text-muted">
          Kuru temizleme işletmeleri için modern yönetim sistemi
        </p>
      </div>
    </footer>
  );
}
