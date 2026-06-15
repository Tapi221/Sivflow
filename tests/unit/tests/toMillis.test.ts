import { describe, expect, it } from "vitest";
import { toDateOrNull } from "@/utils/toMillis";

describe("date utility smoke", () => {
  it("normalizes epoch seconds", () => {
    expect(toDateOrNull(1_700_000_000)?.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });
});
