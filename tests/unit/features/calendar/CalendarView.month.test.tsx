// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { addDays, format, startOfDay } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import type { CalendarMonthWeek } from "@/features/calendar/model/calendarMonth.model";

const { monthWeeksRef } = vi.hoisted(() => ({
  monthWeeksRef: {
    current: [] as CalendarMonthWeek[],
  },
}));

const buildWeek = (weekStart: Date): CalendarMonthWeek => ({
  key: format(weekStart, "yyyy-MM-dd"),
  weekStart,
  visibleMonthDate: weekStart,
  days: Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);

    return {
      date,
      key: format(date, "yyyy-MM-dd"),
      dayOfMonth: date.getDate(),
      isCurrentMonth: true,
      isMonthStart: date.getDate() === 1,
    };
  }),
});

vi.mock("@/features/scroll/schedule/useInfiniteScroll.month.desktop", () => ({
  useMonthInfiniteScroll: () => ({
    monthWeeks: monthWeeksRef.current,
    scrollContainerRef: { current: null },
    weekRowRefsMap: { current: new Map() },
    setWeekRowRef: vi.fn(),
    syncVisibleMonth: vi.fn(),
    cancelVisibleMonthSync: vi.fn(),
  }),
}));

vi.mock("@/features/calendar/grid/Grid.calendar.month.desktop", () => ({
  GridCalendarMonthDesktop: () => <div data-testid="month-grid" />,
}));

const expectSameTime = (actual: Date, expected: Date) => {
  expect(actual.getTime()).toBe(expected.getTime());
};

describe("CalendarMonthView", () => {
  beforeEach(() => {
    monthWeeksRef.current = [];
  });

  it("レンダーされている monthWeeks の先頭日〜末尾日を onRenderedRangeChange で通知する", async () => {
    const firstWeekStart = startOfDay(new Date(2026, 2, 1));
    const lastWeekStart = startOfDay(new Date(2026, 4, 25));
    monthWeeksRef.current = [
      buildWeek(firstWeekStart),
      buildWeek(startOfDay(new Date(2026, 3, 1))),
      buildWeek(lastWeekStart),
    ];
    const onRenderedRangeChange = vi.fn();

    render(
      <CalendarMonthView
        currentDate={new Date(2026, 3, 1)}
        selectedDate={new Date(2026, 3, 15)}
        visibleEvents={[]}
        onSelectDate={vi.fn()}
        onRenderedRangeChange={onRenderedRangeChange}
      />,
    );

    await waitFor(() => {
      expect(onRenderedRangeChange).toHaveBeenCalledTimes(1);
    });

    const range = onRenderedRangeChange.mock.calls[0][0] as {
      start: Date;
      end: Date;
    };

    expectSameTime(range.start, firstWeekStart);
    expectSameTime(range.end, new Date(2026, 4, 31, 23, 59, 59, 999));
  });
});