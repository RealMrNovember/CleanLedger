import type { Locale } from "./locale";
import type { MessageTree } from "./messages/types";

export function getNestedMessageValue(
  tree: MessageTree,
  key: string
): string | undefined {
  const parts = key.split(".");

  function walk(node: unknown, index: number): string | undefined {
    if (index >= parts.length) {
      return typeof node === "string" ? node : undefined;
    }
    if (!node || typeof node !== "object") return undefined;

    const record = node as Record<string, unknown>;
    const part = parts[index];

    if (part in record) {
      const nested = walk(record[part], index + 1);
      if (nested !== undefined) return nested;
    }

    const flatKey = parts.slice(index).join(".");
    const flat = record[flatKey];
    return typeof flat === "string" ? flat : undefined;
  }

  return walk(tree, 0);
}

function interpolate(text: string, params?: Record<string, string>): string {
  if (!params) return text;
  let out = text;
  for (const [name, value] of Object.entries(params)) {
    out = out.replaceAll(`{{${name}}}`, value);
  }
  return out;
}

/**
 * Resolve a message key with mandatory English fallback.
 * Never returns an empty string when English has a value.
 */
export function getTranslationSafe(
  catalogs: Record<Locale, MessageTree>,
  locale: Locale,
  key: string,
  params?: Record<string, string>
): string {
  const enText = getNestedMessageValue(catalogs.en, key);
  const primary = getNestedMessageValue(catalogs[locale], key);

  let text: string;
  if (typeof primary === "string" && primary.trim() !== "") {
    text = primary;
  } else if (typeof enText === "string" && enText.trim() !== "") {
    text = enText;
  } else if (typeof enText === "string") {
    text = enText;
  } else {
    text = key;
  }

  return interpolate(text, params);
}
