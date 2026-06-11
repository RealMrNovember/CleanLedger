import type { Locale } from "./locale";
import type { MessageTree } from "./messages/types";
import { en } from "./messages/en";
import { tr } from "./messages/tr";
import { az } from "./messages/az";
import { ru } from "./messages/ru";
import { fr } from "./messages/fr";
import { it } from "./messages/it";

/** Canonical locale catalogs — single registry for i18n resolution. */
export const i18nCatalogs: Record<Locale, MessageTree> = {
  en,
  tr,
  az,
  ru,
  fr,
  it,
};
