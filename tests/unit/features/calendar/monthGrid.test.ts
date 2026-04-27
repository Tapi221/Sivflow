import { format } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  CALENDAR_MONTH_GRID_CELL_COUNT,
  buildCalendarMonthGridDays,
  buildCalendarMonthPage,
  buildCalendarMonthPages,
  buildCalendarMonthWeeks,
  getCalendarMonthKey,
  getCalendarWeekKey,
} from "@/features/calendar/model/monthGrid";

const toKey = (date: Date) => format(date, "yyyy-MM-dd");

describe("monthGrid", () => {
  it("2026年4月を日曜始まりの42セルで構築する", () => {
    const days = buildCalendarMonthGridDays(new Date(2026, 3, 1));

    expect(days).toHaveLength(CALENDAR_MONTH_GRID_CELL_COUNT);
    expect(days[0]?.key).toBe("2026-03-29");
    expect(days[3]?.key).toBe("2026-04-01");
    expect(days[32]?.key).toBe("2026-04-30");
    expect(days[33]?.key).toBe("2026-05-01");
    expect(days[34]?.key).toBe("2026-05-02");
    expect(days[41]?.key).toBe("2026-05-09");
  });

  it("当月日と月外日を判定する", () => {
    const days = buildCalendarMonthGridDays(new Date(2026, 3, 27));
    const march31 = days.find((day) => toKey(day.date) === "2026-03-31");
    const april1 = days.find((day) => toKey(day.date) === "2026-04-01");
    const april30 = days.find((day) => toKey(day.date) === "2026-04-30");
    const may1 = days.find((day) => toKey(day.date) === "2026-05-01");

    expect(march31?.isCurrentMonth).toBe(false);
    expect(april1?.isCurrentMonth).toBe(true);
    expect(april30?.isCurrentMonth).toBe(true);
    expect(may1?.isCurrentMonth).toBe(false);
  });

  it("月初セルを判定する", () => {
    const days = buildCalendarMonthGridDays(new Date(2026, 3, 1));
    const april1 = days.find((day) => day.key === "2026-04-01");
    const may1 = days.find((day) => day.key === "2026-05-01");
    const april2 = days.find((day) => day.key === "2026-04-02");

    expect(april1?.isMonthStart).toBe(true);
    expect(may1?.isMonthStart).toBe(true);
    expect(april2?.isMonthStart).toBe(false);
  });

  it("月キーと週キーを安定した文字列にする", () => {
    expect(getCalendarMonthKey(new Date(2026, 3, 27))).toBe("2026-04");
    expect(getCalendarWeekKey(new Date(2026, 3, 27))).toBe("2026-04-26");
  });

  it("月ページを指定オフセット範囲で構築する", () => {
    const pages = buildCalendarMonthPages({
      anchorDate: new Date(2026, 3, 27),
      startOffset: -1,
      endOffset: 1,
    });

    expect(pages.map((page) => page.key)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
    expect(pages.every((page) => page.days.length === 42)).toBe(true);
  });

  it("単月ページを構築する", () => {
    const page = buildCalendarMonthPage(new Date(2026, 3, 27));

    expect(page.key).toBe("2026-04");
    expect(page.label).toBe("2026年 4月");
    expect(page.days).toHaveLength(42);
  });

  it("縦スクロール用の週ストリームは日付を重複させない", () => {
    const weeks = buildCalendarMonthWeeks({
      anchorDate: new Date(2026, 3, 27),
      startOffset: 0,
      endOffset: 1,
    });
    const dayKeys = weeks.flatMap((week) => week.days.map((day) => day.key));

    expect(new Set(dayKeys).size).toBe(dayKeys.length);
    expect(dayKeys).toContain("2026-04-30");
    expect(dayKeys).toContain("2026-05-01");
    expect(dayKeys).toContain("2026-05-02");
  });

  it("月境界の週を1行として連続表示できる", () => {
    const weeks = buildCalendarMonthWeeks({
      anchorDate: new Date(2026, 3, 27),
      startOffset: 0,
      endOffset: 1,
    });
    const transitionWeek = weeks.find((week) => week.key === "2026-04-26");
    const nextWeek = weeks.find((week) => week.key === "2026-05-03");

    expect(transitionWeek?.days.map((day) => day.key)).toEqual([
      "2026-04-26",
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
      "2026-05-02",
    ]);
    expect(nextWeek?.days.map((day) => day.key)).toEqual([
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
      "2026-05-06",
      "2026-05-07",
      "2026-05-08",
      "2026-05-09",
    ]);
  });

  it("週ごとの表示月を中央日で判定する", () => {
    const weeks = buildCalendarMonthWeeks({
      anchorDate: new Date(2026, 3, 27),
      startOffset: 0,
      endOffset: 1,
    });
    const aprilTransitionWeek = weeks.find((week) => week.key === "2026-04-26");
    const mayWeek = weeks.find((week) => week.key === "2026-05-03");

    expect(
      getCalendarMonthKey(aprilTransitionWeek?.visibleMonthDate ?? new Date()),
    ).toBe("2026-04");
    expect(getCalendarMonthKey(mayWeek?.visibleMonthDate ?? new Date())).toBe(
      "2026-05",
    );
  });
});
