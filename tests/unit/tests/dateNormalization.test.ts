import { describe, expect, it } from "vitest";

import { normalizeDate } from "@/shared/codec/date";

describe("normalizeDate", () => {
  it("treats numeric epoch seconds as seconds", () => {
    expect(normalizeDate(1_700_000_000)?.toISOString()).toBe(
      "2023-11-14T22:13:20.000Z",
    );
  });

  it("treats numeric epoch milliseconds as milliseconds", () => {
    expect(normalizeDate(1_700_000_000_000)?.toISOString()).toBe(
      "2023-11-14T22:13:20.000Z",
    );
  });

  it("treats 10-13 digit numeric strings as epoch values", () => {
    expect(normalizeDate("1700000000")?.toISOString()).toBe(
      "2023-11-14T22:13:20.000Z",
    );
    expect(normalizeDate("1700000000000")?.toISOString()).toBe(
      "2023-11-14T22:13:20.000Z",
    );
  });

  it("supports firestore-like timestamp objects", () => {
    expect(
      normalizeDate({
        seconds: 1_700_000_000,
        nanoseconds: 500_000_000,
      })?.toISOString(),
    ).toBe("2023-11-14T22:13:20.500Z");
  });
});
