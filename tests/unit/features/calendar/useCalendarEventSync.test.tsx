import { addDays, endOfDay, endOfYear, startOfDay, startOfYear, subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { buildCalendarEventSyncRange } from "@/sync/googlecalendar-sync/calendarEventSyncRange";

const expectSameTime = (actual: Date | undefined, expected: Date) => {
  expect(actual?.getTime()).toBe(expected.getTime());
};

describe("buildCalendarEventSyncRange", () => {
  it("年表示ではレンダー済み年範囲を同期する", () => {
    const yearRenderedRange: CalendarDateRange = {
      start: new Date(2023, 0, 1),
      end: endOfDay(new Date(2027, 11, 31)),
    };

    const range = buildCalendarEventSyncRange({
      selectedViewMode: "year",
      visibleDays: [],
      monthTitleDate: new Date(2025, 0, 1),
      yearRenderedRange,
    });

    expectSameTime(range.rangeStart, startOfDay(startOfYear(yearRenderedRange.start)));
    expectSameTime(range.rangeEnd, endOfDay(endOfYear(yearRenderedRange.end)));
  });

  it("月表示ではレンダー済み範囲を優先して前後 buffer を付けて同期する", () => {
    const monthRenderedRange: CalendarDateRange = {
      start: new Date(2026, 2, 1),
      end: endOfDay(new Date(2026, 4, 31)),
    };

    const range = buildCalendarEventSyncRange({
      selectedViewMode: "month",
      visibleDays: [],
      monthTitleDate: new Date(2026, 0, 1),
      monthRenderedRange,
    });

    expectSameTime(
      range.rangeStart,
      startOfDay(
        subDays(monthRenderedRange.start, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
      ),
    );
    expectSameTime(
      range.rangeEnd,
      endOfDay(
        addDays(monthRenderedRange.end, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
      ),
    );
  });

  it("日表示では visibleDays の前後2日を同期範囲にする", () => {
    const firstVisibleDay = new Date(2026, 4, 10);
    const lastVisibleDay = new Date(2026, 4, 14);

    const range = buildCalendarEventSyncRange({
      selectedViewMode: "days",
      visibleDays: [firstVisibleDay, lastVisibleDay],
      monthTitleDate: new Date(2026, 4, 1),
    });

    expectSameTime(range.rangeStart, startOfDay(subDays(firstVisibleDay, 2)));
    expectSameTime(range.rangeEnd, endOfDay(addDays(lastVisibleDay, 2)));
  });

  it("週表示では visibleDays の前後3日を同期範囲にする", () => {
    const firstVisibleDay = new Date(2026, 4, 4);
    const lastVisibleDay = new Date(2026, 4, 10);

    const range = buildCalendarEventSyncRange({
      selectedViewMode: "week",
      visibleDays: [firstVisibleDay, lastVisibleDay],
      monthTitleDate: new Date(2026, 4, 1),
    });

    expectSameTime(range.rangeStart, startOfDay(subDays(firstVisibleDay, 3)));
    expectSameTime(range.rangeEnd, endOfDay(addDays(lastVisibleDay, 3)));
  });
});
