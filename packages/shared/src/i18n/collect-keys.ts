/** Collect dot-path message keys from a nested catalog tree. */
export function collectMessageKeys(
  tree: Record<string, unknown>,
  prefix = ""
): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") keys.push(path);
    else if (value && typeof value === "object") {
      keys.push(...collectMessageKeys(value as Record<string, unknown>, path));
    }
  }
  return keys.sort();
}
