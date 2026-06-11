import type { MessageTree } from "./types";
import { deepMergeMessages } from "./deep-merge";

type MessagePatch = {
  [K in keyof MessageTree]?: Partial<MessageTree[K]>;
};

/**
 * @deprecated Use deepMergeMessages / buildLocaleFromEnglish instead.
 * Kept for compatibility — now delegates to deep merge.
 */
export function mergeMessages(base: MessageTree, patch: MessagePatch): MessageTree {
  return deepMergeMessages(
    base as unknown as Record<string, unknown>,
    patch as unknown as Record<string, unknown>
  ) as MessageTree;
}
