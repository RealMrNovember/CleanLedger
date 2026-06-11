/**
 * Recursively merge locale patches onto the English catalog.
 * Unpatched leaf keys inherit English values (single source of truth).
 */
export function deepMergeMessages<T extends Record<string, unknown>>(
  base: T,
  patch: Record<string, unknown>
): T {
  const out: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;

    const baseValue = base[key];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      baseValue !== null &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      out[key] = deepMergeMessages(
        baseValue as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      out[key] = value;
    }
  }

  return out as T;
}
