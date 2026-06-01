import { addDays, endOfDay, endOfYear, startOfDay, startOfYear, subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { buildCalendarEventPrioritySyncRange, buildCalendarEventSyncRange } from "@/sync/googlecalendar-sync/calendarEventSyncRange";

const expectSameTime = (actual: Date | undefined, expected: Date) => {
  expect(actual?.getTime()).toBe(expected.getTime());
};

describe("buildCalendarEventSyncRange", () => {
  it("年表示では表示中の年範囲を同期する", () => {
    const yearSyncRange: CalendarDateRange = {
      start: new Date(2023, 0, 1),
      end: endOfDay(new Date(2027, 11, 31)),
    };

    const range = buildCalendarEventSyncRange({
      selectedViewMode: "year",
      visibleDays: [],
      monthTitleDate: new Date(2025, 0, 1),
      yearSyncRange,
    });

    expectSameTime(range.rangeStart, startOfDay(startOfYear(yearSyncRange.start)));
    expectSameTime(range.rangeEnd, endOfDay(endOfYear(yearSyncRange.end)));
  });

  it("月表示では表示月のカレンダー範囲に前後 buffer を付けて同期する", () => {
    const monthRenderedRange: CalendarDateRange = {
      start: new Date(2026, 2, 1),
      end: endOfDay(new Date(2026, 4, 31)),
    };
    const monthTitleDate = new Date(2026, 0, 1);

    const range = buildCalendarEventSyncRange({
      selectedViewMode: "month",
      visibleDays: [],
      monthTitleDate,
      monthRenderedRange,
    });
    const gridStart = new Date(2025, 11, 29);
    const gridEnd = new Date(2026, 1, 1);

    expectSameTime(
      range.rangeStart,
      startOfDay(
        subDays(gridStart, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
      ),
    );
    expectSameTime(
      range.rangeEnd,
      endOfDay(
        addDays(gridEnd, C.MONTH_VIEW_EVENT_RANGE_BUFFER_DAYS),
      ),
    );
  });

  it("日表示ではタイトル日を中心に同期範囲にする", () => {
    const firstVisibleDay = new Date(2026, 4, 10);
    const lastVisibleDay = new Date(2026, 4, 14);

    const range = buildCalendarEventSyncRange({
      selectedViewMode: "days",
      visibleDays: [firstVisibleDay, lastVisibleDay],
      monthTitleDate: new Date(2026, 4, 1),
    });

    expectSameTime(range.rangeStart, startOfDay(subDays(new Date(2026, 4, 1), 21)));
    expectSameTime(range.rangeEnd, endOfDay(new Date(2026, 5, 6)));
  });

  it("週表示ではタイトル日を中心に同期範囲にする", () => {
    const firstVisibleDay = new Date(2026, 4, 4);
    const lastVisibleDay = new Date(2026, 4, 10);

    const range = buildCalendarEventSyncRange({
      selectedViewMode: "week",
      visibleDays: [firstVisibleDay, lastVisibleDay],
      monthTitleDate: new Date(2026, 4, 1),
    });

    expectSameTime(range.rangeStart, startOfDay(subDays(new Date(2026, 4, 1), 21)));
    expectSameTime(range.rangeEnd, endOfDay(new Date(2026, 5, 6)));
  });

  it("週表示の優先同期では表示週と隣接週を先に同期する", () => {
    const firstVisibleDay = new Date(2026, 4, 4);
    const lastVisibleDay = new Date(2026, 4, 10);

    const range = buildCalendarEventPrioritySyncRange({
      selectedViewMode: "week",
      visibleDays: [firstVisibleDay, lastVisibleDay],
      monthTitleDate: new Date(2026, 4, 1),
    });

    expectSameTime(range.rangeStart, startOfDay(subDays(firstVisibleDay, 7)));
    expectSameTime(range.rangeEnd, endOfDay(addDays(lastVisibleDay, 7)));
  });
});
