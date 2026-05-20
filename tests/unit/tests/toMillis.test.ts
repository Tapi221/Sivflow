import { describe, expect, it } from "vitest";

import { normalizeDate } from "@/shared/codec/date";
import {
  toDateOrNull,
  toIsoStringOrNull,
  toMillis,
  toMillisOrNull,
} from "@/utils/toMillis";

describe("toMillis utilities", () => {
  it("treats numeric epoch seconds as seconds", () => {
    expect(toMillis(1_700_000_000)).toBe(1_700_000_000_000);
  });

  it("treats numeric epoch milliseconds as milliseconds", () => {
    expect(toMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it("treats 10-13 digit numeric strings as epoch values", () => {
    expect(toMillis("1700000000")).toBe(1_700_000_000_000);
    expect(toMillis("1700000000000")).toBe(1_700_000_000_000);
  });

  it("supports firestore-like timestamp objects with seconds and nanoseconds", () => {
    expect(
      toMillis({
        seconds: 1_700_000_000,
        nanoseconds: 500_000_000,
      }),
    ).toBe(1_700_000_000_500);
  });

  it("supports timestamp objects with toMillis()", () => {
    expect(
      toMillis({
        toMillis: () => 1_700_000_000_123,
      }),
    ).toBe(1_700_000_000_123);
  });

  it("returns nullish fallbacks safely for invalid values", () => {
    expect(toMillisOrNull("not-a-date")).toBeNull();
    expect(toDateOrNull("not-a-date")).toBeNull();
    expect(toIsoStringOrNull("not-a-date")).toBeNull();
    expect(toMillis("not-a-date")).toBe(0);
    expect(toMillis("not-a-date", 123)).toBe(123);
  });

  it("normalizes Date objects without mutating semantics", () => {
    const source = new Date("2026-04-15T10:20:30.000Z");
    expect(toMillis(source)).toBe(source.getTime());
    expect(toIsoStringOrNull(source)).toBe("2026-04-15T10:20:30.000Z");
  });

  it("keeps normalizeDate aligned with toDateOrNull", () => {
    const value = {
      seconds: 1_700_000_000,
      nanoseconds: 250_000_000,
    };

    expect(normalizeDate(value)?.toISOString()).toBe(
      "2023-11-14T22:13:20.250Z",
    );
    expect(toDateOrNull(value)?.toISOString()).toBe("2023-11-14T22:13:20.250Z");
  });
});
