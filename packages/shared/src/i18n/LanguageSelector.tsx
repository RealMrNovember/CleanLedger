import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import {
  type Locale,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  SUPPORTED_LOCALES,
} from "./index";

export interface LanguageSelectorProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  /** compact: icon-only trigger for dense navbars */
  variant?: "default" | "compact";
  className?: string;
}

export function LanguageSelector({
  locale,
  onLocaleChange,
  variant = "default",
  className = "",
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/60 bg-background px-2.5 text-sm font-medium transition hover:bg-muted sm:px-3"
        aria-label="Language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-base leading-none" aria-hidden>
          {LOCALE_FLAGS[locale]}
        </span>
        {variant === "default" && (
          <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
        )}
        <Globe className="size-4 text-muted-foreground sm:hidden" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-border/60 bg-popover py-1 shadow-lg"
        >
          {SUPPORTED_LOCALES.map((code) => (
            <li key={code} role="option" aria-selected={code === locale}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted ${
                  code === locale ? "bg-muted/60 font-semibold" : ""
                }`}
                onClick={() => {
                  onLocaleChange(code);
                  setOpen(false);
                }}
              >
                <span className="text-base">{LOCALE_FLAGS[code]}</span>
                <span>{LOCALE_LABELS[code]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
