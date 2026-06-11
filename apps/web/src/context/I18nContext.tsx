import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type Locale,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  resolveLocale,
  saveLocale,
  getTranslationSafe,
  translateProduct as translateProductByLocale,
  translateColor as translateColorByLocale,
} from "@cleanledger/shared/i18n";
import {
  buildSchemaLabels,
  type SchemaLabels,
} from "@cleanledger/shared/i18n/labels";
import { resolveColorDisplayI18n } from "@cleanledger/shared/i18n/product-mapper";
import type { ProductColorPreset } from "@cleanledger/shared";
import { translateAppError } from "@cleanledger/shared/i18n/translate-error";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  labels: SchemaLabels;
  translateProduct: (product: {
    name: string;
    iconName?: string | null;
  }) => string;
  translateColor: (preset: { label: string; hex: string }) => string;
  resolveColor: (
    palette: ProductColorPreset[],
    value: string | null | undefined
  ) => ProductColorPreset | null;
  locales: Locale[];
  localeLabels: typeof LOCALE_LABELS;
  formatError: (err: unknown) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = resolveLocale();
    if (typeof document !== "undefined") document.documentElement.lang = initial;
    return initial;
  });

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next);
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>) =>
      getTranslationSafe(locale, key, params),
    [locale]
  );

  const labels = useMemo(() => buildSchemaLabels(t), [t]);

  const translateProduct = useCallback(
    (product: { name: string; iconName?: string | null }) =>
      translateProductByLocale(locale, product),
    [locale]
  );

  const translateColor = useCallback(
    (preset: { label: string; hex: string }) =>
      translateColorByLocale(locale, preset),
    [locale]
  );

  const resolveColor = useCallback(
    (palette: ProductColorPreset[], value: string | null | undefined) =>
      resolveColorDisplayI18n(t, palette, value),
    [t]
  );

  const formatError = useCallback(
    (err: unknown) => translateAppError(t, err),
    [t]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      labels,
      translateProduct,
      translateColor,
      resolveColor,
      formatError,
      locales: SUPPORTED_LOCALES,
      localeLabels: LOCALE_LABELS,
    }),
    [locale, setLocale, t, labels, translateProduct, translateColor, resolveColor, formatError]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
