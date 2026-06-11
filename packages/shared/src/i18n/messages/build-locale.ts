import type { MessageTree } from "./types";
import { enCatalog } from "./en-catalog";
import { deepMergeMessages } from "./deep-merge";

export type LocalePatch = {
  [K in keyof MessageTree]?: MessageTree[K] extends Record<string, infer V>
    ? V extends string
      ? Partial<MessageTree[K]>
      : Partial<MessageTree[K]>
    : never;
};

/** Build a locale catalog: English structure + optional translated overrides. */
export function buildLocaleFromEnglish(
  patch: Record<string, unknown>
): MessageTree {
  return deepMergeMessages(
    enCatalog as unknown as Record<string, unknown>,
    patch
  ) as MessageTree;
}
