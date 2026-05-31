// @vitest-environment jsdom

import type { RefObject } from "react";
import { createRef } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { CalendarGridStyle } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

vi.mock("@/chip/toolchip/HoverEventTooltip", () => ({
  HoverEventTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const createCalendarGridStyle = (): CalendarGridStyle => ({
  "--calendar-hour-row-height": "72px",
});

const createRefs = (): {
  headerScrollRef: RefObject<HTMLDivElement | null>;
  allDayScrollRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
} => ({
  headerScrollRef: createRef<HTMLDivElement>(),
  allDayScrollRef: createRef<HTMLDivElement>(),
  scrollContainerRef: createRef<HTMLDivElement>(),
});

const createEvent = (overrides: Partial<GoogleCalendarEvent>): GoogleCalendarEvent => ({
  id: "event-1",
  calendarId: "calendar-1",
  title: "Preview event",
  startsAt: new Date(2026, 0, 2, 0, 0),
  endsAt: new Date(2026, 0, 2, 1, 0),
  isAllDay: false,
  accentColor: "#34c759",
  ...overrides,
});

const renderWeekDayGrid = (visibleEvents: GoogleCalendarEvent[] = []) => {
  const refs = createRefs();

  render(
    <CalendarWeekDayGrid
      headerScrollRef={refs.headerScrollRef}
      allDayScrollRef={refs.allDayScrollRef}
      scrollContainerRef={refs.scrollContainerRef}
      visibleDays={[new Date(2026, 0, 1)]}
      visibleEvents={visibleEvents}
      calendarGridStyle={createCalendarGridStyle()}
      selectedDate={new Date(2026, 0, 1)}
      onSelectDate={vi.fn()}
    />,
  );
};

describe("CalendarWeekDayGrid", () => {
  afterEach(() => {
    cleanup();
  });

  it("終日ラベルと00:00ラベルを別行に描画し、00:00を上端方向にずらさない", () => {
    renderWeekDayGrid();

    const allDayLabel = screen.getByText("終日");
    const midnightLabel = screen.getByText("00:00");

    expect(allDayLabel.closest(".border-b")).not.toBe(midnightLabel.closest(".border-b"));
    expect(midnightLabel.className).not.toContain("-translate-y-1/2");
  });

  it("24:00ラベルを下端方向にずらさず、時刻列側ではクリップしない", () => {
    renderWeekDayGrid([createEvent({ id: "next-day-event" })]);

    const bottomTimeSpacer = screen.getByTestId("weekday-time-bottom-spacer");
    const previewSpacer = screen.getByTestId("weekday-preview-bottom-spacer");
    const endOfDayLabel = screen.getByText("24:00");

    expect(endOfDayLabel.className).not.toContain("-translate-y-1/2");
    expect(bottomTimeSpacer.className).not.toContain("overflow-hidden");
    expect(previewSpacer.className).toContain("overflow-hidden");
  });
});
