import { uuidv7 } from "./uuid-v7";

/** Yeni global entity kimliği — her zaman UUID v7. */
export function createGlobalId(nowMs?: number): string {
  return uuidv7(nowMs);
}
