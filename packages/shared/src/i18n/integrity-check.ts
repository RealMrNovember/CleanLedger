import type { Locale } from "./locale";
import type { MessageTree } from "./messages/types";
import { SUPPORTED_LOCALES } from "./locale";
import { collectMessageKeys } from "./collect-keys";

export class I18nIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "I18nIntegrityError";
  }
}

/**
 * Pre-build integrity gate: every locale must expose the exact same key set as English.
 * Throws before consumers bundle broken catalogs.
 */
export function assertI18nIntegrity(
  catalogs: Record<Locale, MessageTree>
): void {
  const enKeys = collectMessageKeys(catalogs.en);
  if (enKeys.length === 0) {
    throw new I18nIntegrityError("English catalog is empty — cannot verify parity.");
  }

  const errors: string[] = [];

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === "en") continue;
    const keys = collectMessageKeys(catalogs[locale]);
    const missing = enKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !enKeys.includes(k));

    if (missing.length > 0) {
      errors.push(
        `[${locale}] missing ${missing.length} key(s):\n  ${missing.slice(0, 15).join("\n  ")}${missing.length > 15 ? `\n  … +${missing.length - 15} more` : ""}`
      );
    }
    if (extra.length > 0) {
      errors.push(
        `[${locale}] extra ${extra.length} key(s):\n  ${extra.join("\n  ")}`
      );
    }
  }

  if (errors.length > 0) {
    throw new I18nIntegrityError(
      `i18n catalog parity check failed:\n\n${errors.join("\n\n")}`
    );
  }
}
