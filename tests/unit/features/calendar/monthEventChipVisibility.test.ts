import { describe, expect, it } from "vitest";
import { getVisibleMonthEventChipCount } from "@/chip/eventchip/EventChip.month.placement";
import { DEFAULT_MONTH_ROW_HEIGHT } from "@/features/calendar/calendar.constants.desktop";

describe("month event chip visibility", () => {
  it("デフォルト行高で3件と省略表示を表示できる", () => {
    expect(getVisibleMonthEventChipCount(4, DEFAULT_MONTH_ROW_HEIGHT)).toBe(3);
  });

  it("省略表示が不要な場合は全件表示する", () => {
    expect(getVisibleMonthEventChipCount(3, DEFAULT_MONTH_ROW_HEIGHT)).toBe(3);
  });
});
