// @vitest-environment jsdom

import { addDays, startOfMonth } from "date-fns";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarListView } from "@/features/calendar/list/CalendarListView.desktop";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

const SELECTED_DATE = new Date("2026-06-15T00:00:00+09:00");
const MONTH_START = startOfMonth(SELECTED_DATE);
const MONTH_DAYS = Array.from({ length: 30 }, (_, index) =>
  addDays(MONTH_START, index),
);

const VIRTUAL_RAIL: ScheduleVirtualRail = {
  startDate: MONTH_START,
  anchorIndex: 0,
  totalDayCount: MONTH_DAYS.length,
};

const TIMED_EVENT: GoogleCalendarEvent = {
  id: "event-1",
  calendarId: "calendar-1",
  title: "設計レビュー",
  startsAt: new Date("2026-06-15T09:00:00+09:00"),
  endsAt: new Date("2026-06-15T10:00:00+09:00"),
  isAllDay: false,
  accentColor: "#2f9f6b",
};

describe("CalendarListView", () => {
  it("イベント日と空日の両方を描画する", () => {
    render(
      <CalendarListView
        days={MONTH_DAYS}
        virtualRail={VIRTUAL_RAIL}
        events={[TIMED_EVENT]}
        selectedDate={SELECTED_DATE}
      />,
    );

    expect(screen.getByText("設計レビュー")).toBeTruthy();
    expect(screen.getAllByText("予定なし").length).toBeGreaterThan(0);
  });
});
