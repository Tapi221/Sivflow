import { describe, expect, it } from "vitest";
import { toDateOrNull, toIsoStringOrNull, toMillis, toMillisOrNull } from "@/utils/toMillis";

describe("toMillis utilities", () => {
  it("normalizes epoch values", () => {
    expect(toMillis(1_700_000_000)).toBe(1_700_000_000_000);
    expect(toMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(toMillis("1700000000")).toBe(1_700_000_000_000);
  });
  it("normalizes timestamp-like values", () => {
    const value = { seconds: 1_700_000_000, nanoseconds: 250_000_000 };
    expect(toDateOrNull(value)?.toISOString()).toBe("2023-11-14T22:13:20.250Z");
    expect(toIsoStringOrNull(value)).toBe("2023-11-14T22:13:20.250Z");
    expect(toMillisOrNull(value)).toBe(1_700_000_000_250);
  });
});
