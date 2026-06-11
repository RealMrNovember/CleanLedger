import type { MessageTree } from "./types";

type MessagePatch = {
  [K in keyof MessageTree]?: Partial<MessageTree[K]>;
};

export function mergeMessages(base: MessageTree, patch: MessagePatch): MessageTree {
  const out: Record<string, unknown> = { ...base };
  (Object.keys(patch) as (keyof MessageTree)[]).forEach((key) => {
    const section = patch[key];
    if (section) {
      out[key as string] = { ...base[key], ...section };
    }
  });
  return out as MessageTree;
}
