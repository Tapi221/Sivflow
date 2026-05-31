import { describe, expect, it } from "vitest";
import { normalizeDate } from "@/shared/codec/date";
import { toDateOrNull, toIsoStringOrNull, toMillis, toMillisOrNull } from "@/utils/toMillis";

describe("toMillis utilities", () => {
  it("数値の epoch 秒を秒として扱う", () => {
    expect(toMillis(1_700_000_000)).toBe(1_700_000_000_000);
  });

  it("数値の epoch ミリ秒をミリ秒として扱う", () => {
    expect(toMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it("10〜13 桁の数値文字列を epoch 値として扱う", () => {
    expect(toMillis("1700000000")).toBe(1_700_000_000_000);
    expect(toMillis("1700000000000")).toBe(1_700_000_000_000);
  });

  it("seconds と nanoseconds を持つ Firestore 風 timestamp object に対応する", () => {
    expect(
      toMillis({
        seconds: 1_700_000_000,
        nanoseconds: 500_000_000,
      }),
    ).toBe(1_700_000_000_500);
  });

  it("toMillis() を持つ timestamp object に対応する", () => {
    expect(
      toMillis({
        toMillis: () => 1_700_000_000_123,
      }),
    ).toBe(1_700_000_000_123);
  });

  it("無効な値では nullish fallback を安全に返す", () => {
    expect(toMillisOrNull("not-a-date")).toBeNull();
    expect(toDateOrNull("not-a-date")).toBeNull();
    expect(toIsoStringOrNull("not-a-date")).toBeNull();
    expect(toMillis("not-a-date")).toBe(0);
    expect(toMillis("not-a-date", 123)).toBe(123);
  });

  it("Date object を意味を変えずに正規化する", () => {
    const source = new Date("2026-04-15T10:20:30.000Z");
    expect(toMillis(source)).toBe(source.getTime());
    expect(toIsoStringOrNull(source)).toBe("2026-04-15T10:20:30.000Z");
  });

  it("normalizeDate を toDateOrNull と一致させる", () => {
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
