// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCalendarEventSync } from "../../../../src/features/calendar/googlecalendar-sync/useCalendarEventSync";
import * as C from "../../../../src/features/calendar/calendar.constants.desktop";
import type { CalendarDateRange } from "../../../../src/features/calendar/calendarRange.types";

const forceSyncRange = vi.fn<
  (options: { rangeStart?: Date; rangeEnd?: Date }) => void
>();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: null) => void) => {
    callback(null);
    return vi.fn();
  }),
}));

vi.mock("@/services/firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock(
  "../../../../src/features/calendar/googlecalendar-sync/useGoogleCalendarPushSync",
  () => ({
    useGoogleCalendarPushSync: vi.fn(),
  }),
);

const selectedCalendarIds = new Set(["primary"]);

const expectSameTime = (actual: Date | undefined, expected: Date) => {
  expect(actual?.getTime()).toBe(expected.getTime());
};

describe("useCalendarEventSync", () => {
  beforeEach(() => {
    forceSyncRange.mockClear();
  });

  it("月表示ではレンダー済み範囲を優先して前後 buffer を付けて同期する", async () => {
    const monthRenderedRange: CalendarDateRange = {
      start: new Date(2026, 2, 1),
      end: endOfDay(new Date(2026, 4, 31)),
    };

    renderHook(() =>
      useCalendarEventSync({
        activeMode: "calendar",
        selectedViewMode: "month",
        visibleDays: [],
        monthTitleDate: new Date(2026, 0, 1),
        monthRenderedRange,
        googleCalendar: {
          selectedCalendarIds,
          forceSyncRange,
        },
      }),
    );

    await waitFor(() => {
      expect(forceSyncRange).toHaveBeenCalledTimes(1);
    });

    const range = forceSyncRange.mock.calls[0][0];

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

  it("日表示では visibleDays の前後2日を同期範囲にする", async () => {
    const firstVisibleDay = new Date(2026, 4, 10);
    const lastVisibleDay = new Date(2026, 4, 14);

    renderHook(() =>
      useCalendarEventSync({
        activeMode: "calendar",
        selectedViewMode: "days",
        visibleDays: [firstVisibleDay, lastVisibleDay],
        monthTitleDate: new Date(2026, 4, 1),
        googleCalendar: {
          selectedCalendarIds,
          forceSyncRange,
        },
      }),
    );

    await waitFor(() => {
      expect(forceSyncRange).toHaveBeenCalledTimes(1);
    });

    const range = forceSyncRange.mock.calls[0][0];

    expectSameTime(range.rangeStart, startOfDay(subDays(firstVisibleDay, 2)));
    expectSameTime(range.rangeEnd, endOfDay(addDays(lastVisibleDay, 2)));
  });

  it("週表示では visibleDays の前後3日を同期範囲にする", async () => {
    const firstVisibleDay = new Date(2026, 4, 4);
    const lastVisibleDay = new Date(2026, 4, 10);

    renderHook(() =>
      useCalendarEventSync({
        activeMode: "calendar",
        selectedViewMode: "week",
        visibleDays: [firstVisibleDay, lastVisibleDay],
        monthTitleDate: new Date(2026, 4, 1),
        googleCalendar: {
          selectedCalendarIds,
          forceSyncRange,
        },
      }),
    );

    await waitFor(() => {
      expect(forceSyncRange).toHaveBeenCalledTimes(1);
    });

    const range = forceSyncRange.mock.calls[0][0];

    expectSameTime(range.rangeStart, startOfDay(subDays(firstVisibleDay, 3)));
    expectSameTime(range.rangeEnd, endOfDay(addDays(lastVisibleDay, 3)));
  });
});
