// @vitest-environment jsdom
import { addDays, addMinutes, startOfMonth } from "date-fns";
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
const createVirtualEvent = (index: number): GoogleCalendarEvent => {
  const startsAt = addMinutes(new Date("2026-06-15T09:00:00+09:00"), index);
  return {
    id: `virtual-event-${index}`,
    calendarId: "calendar-1",
    title: `仮想予定 ${String(index).padStart(3, "0")}`,
    startsAt,
    endsAt: addMinutes(startsAt, 30),
    isAllDay: false,
    accentColor: "#2f9f6b",
  };
};
const renderCalendarListView = (events: GoogleCalendarEvent[] = [TIMED_EVENT]) =>
  render(
    <CalendarListView
      days={MONTH_DAYS}
      virtualRail={VIRTUAL_RAIL}
      events={events}
      selectedDate={SELECTED_DATE}
    />,
  );

describe("CalendarListView", () => {
  it("イベント日と空日の両方を描画する", () => {
    renderCalendarListView();
    expect(screen.getByText("設計レビュー")).toBeTruthy();
    expect(screen.getAllByText("予定なし").length).toBeGreaterThan(0);
  });
  it("予定チップ単位で描画範囲を切る", () => {
    const events = Array.from({ length: 240 }, (_, index) =>
      createVirtualEvent(index),
    );
    renderCalendarListView(events);
    expect(screen.getByText("仮想予定 000")).toBeTruthy();
    expect(screen.queryByText("仮想予定 239")).toBeNull();
  });
  it("リスト表示のスクロール領域はスクロールバー非表示で右側の溝を予約しない", () => {
    const { container } = renderCalendarListView();
    const scrollViewport = container.querySelector(".scrollbar-hidden.overflow-y-auto");
    expect(scrollViewport).toBeInstanceOf(HTMLDivElement);
    expect(scrollViewport).toHaveClass("scrollbar-hidden");
    expect(scrollViewport).not.toHaveClass("pr-1");
    expect(scrollViewport).not.toHaveClass("pr-2");
    expect(scrollViewport).not.toHaveClass("scrollbar-gutter-stable");
    expect(scrollViewport).not.toHaveClass("[scrollbar-gutter:stable]");
  });
});
