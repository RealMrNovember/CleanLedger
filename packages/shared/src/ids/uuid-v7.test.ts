import { describe, expect, it } from "vitest";
import { isUuidV7, uuidV7Timestamp, uuidv7 } from "./uuid-v7";

describe("uuidv7", () => {
  it("üretilen kimlik v7 formatındadır", () => {
    const id = uuidv7(1_700_000_000_000);
    expect(isUuidV7(id)).toBe(true);
    expect(id[14]).toBe("7");
  });

  it("zaman damgası geri okunabilir", () => {
    const ts = 1_746_000_000_123;
    const id = uuidv7(ts);
    expect(uuidV7Timestamp(id)).toBe(ts);
  });

  it("ardışık üretimde çakışma olmaz", () => {
    const ids = new Set(Array.from({ length: 200 }, () => uuidv7()));
    expect(ids.size).toBe(200);
  });
});
