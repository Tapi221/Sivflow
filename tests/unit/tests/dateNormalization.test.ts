import { describe, expect, it } from "vitest";
import { normalizeDate } from "@/utils/codec/date";

describe("normalizeDate", () => {
  it("normalizes epoch values", () => {
    expect(normalizeDate(1_700_000_000)?.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    expect(normalizeDate(1_700_000_000_000)?.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    expect(normalizeDate("1700000000")?.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });
});
