/**
 * Saf UUID v7 üretici (RFC 9562 uyumlu).
 * Platform bağımsız — Node.js worker ve tarayıcıda çalışır.
 */

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Zaman damgalı UUID v7 — offline-first conflict resolution için. */
export function uuidv7(timestampMs: number = Date.now()): string {
  const ts = BigInt(Math.max(0, Math.floor(timestampMs)));
  const bytes = new Uint8Array(16);
  const rand = randomBytes(10);

  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);

  bytes[6] = (rand[0] & 0x0f) | 0x70;
  bytes[7] = rand[1];
  bytes[8] = (rand[2] & 0x3f) | 0x80;
  bytes[9] = rand[3];
  bytes[10] = rand[4];
  bytes[11] = rand[5];
  bytes[12] = rand[6];
  bytes[13] = rand[7];
  bytes[14] = rand[8];
  bytes[15] = rand[9];

  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function isUuidV7(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

export function uuidV7Timestamp(uuid: string): number | null {
  if (!isUuidV7(uuid)) return null;
  const hex = uuid.replace(/-/g, "").toLowerCase();
  if (hex.length !== 32) return null;
  const msHex = hex.slice(0, 12);
  const ms = Number.parseInt(msHex, 16);
  return Number.isFinite(ms) ? ms : null;
}
