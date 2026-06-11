/**
 * İçerik parmak izi — platform bağımsız, senkron dedup için.
 * Kriptografik hash değil; değişiklik tespiti ve sync_queue şişmesini önlemek için yeterli.
 */

export function computeContentFingerprint(content: string): string {
  if (!content) return "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function fingerprintsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();
  if (!left && !right) return true;
  return left === right && left.length > 0;
}
