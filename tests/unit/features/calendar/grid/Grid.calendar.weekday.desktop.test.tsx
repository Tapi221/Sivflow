// @vitest-environment jsdom

import React, { createRef } from "react";
import type { ReactNode, RefObject } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import * as COLOR from "@/features/calendar/grid/grid.color.constants.desktop";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { CalendarGridStyle } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type MockCalendarEventChipWeekdayProps = {
  event: GoogleCalendarEvent;
  compact?: boolean;
};

vi.mock("@/chip/eventchip/EventChip.weekday", () => ({
  CalendarEventChipWeekday: ({ event, compact = false }: MockCalendarEventChipWeekdayProps) => <div data-accent-color={event.accentColor} data-compact={String(compact)} data-testid="weekday-event-chip">{event.title}</div>,
}));

vi.mock("@/chip/toolchip/HoverEventTooltip", () => ({
  HoverEventTooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const HOUR_ROW_HEIGHT_PX = 72;
const TIME_LABEL_COLOR_CLASS = "text-[#b8bcc5]";
const TIME_LABEL_BACKGROUND_CLASS = "bg-white";
const TIME_LABEL_FONT_CLASS = "font-medium";
const ALL_DAY_ACCENT_COLOR = "#34c759";

const createCalendarGridStyle = (): CalendarGridStyle => ({
  "--calendar-hour-row-height": `${HOUR_ROW_HEIGHT_PX}px`,
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

const normalizeCssColor = (color: string): string => {
  const element = document.createElement("div");
  element.style.color = color;

  return element.style.color;
};

const createEvent = (overrides: Partial<GoogleCalendarEvent>): GoogleCalendarEvent => ({
  id: "event-1",
  calendarId: "calendar-1",
  title: "Preview event",
  startsAt: new Date(2026, 0, 2, 0, 0),
  endsAt: new Date(2026, 0, 2, 1, 0),
  isAllDay: false,
  accentColor: ALL_DAY_ACCENT_COLOR,
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

const expectTimeLabelStyleClasses = (label: HTMLElement) => {
  expect(label.className).toContain(TIME_LABEL_COLOR_CLASS);
  expect(label.className).toContain(TIME_LABEL_BACKGROUND_CLASS);
  expect(label.className).toContain(TIME_LABEL_FONT_CLASS);
  expect(label.className).toContain("tabular-nums");
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

  it("24:00ラベルを境界線中央に合わせ、時刻列側ではクリップしない", () => {
    renderWeekDayGrid([createEvent({ id: "next-day-event" })]);

    const bottomTimeSpacer = screen.getByTestId("weekday-time-bottom-spacer");
    const previewSpacer = screen.getByTestId("weekday-preview-bottom-spacer");
    const endOfDayLabel = screen.getByText("24:00");

    expect(endOfDayLabel.className).toContain("-translate-y-1/2");
    expect(bottomTimeSpacer.className).not.toContain("overflow-hidden");
    expect(previewSpacer.className).toContain("overflow-hidden");
  });

  it("時刻ラベルの色、背景、数字用スタイルを維持する", () => {
    renderWeekDayGrid();

    expectTimeLabelStyleClasses(screen.getByText("00:00"));
    expectTimeLabelStyleClasses(screen.getByText("01:00"));
    expectTimeLabelStyleClasses(screen.getByText("24:00"));
  });

  it("終日ラベルとグリッド線の色を維持する", () => {
    renderWeekDayGrid();

    const allDayLabel = screen.getByText("終日");
    const firstHourRow = screen.getByText("00:00").closest(".border-b") as HTMLElement | null;

    expect(allDayLabel.className).toContain(TIME_LABEL_COLOR_CLASS);
    expect(allDayLabel.className).toContain(TIME_LABEL_FONT_CLASS);
    expect(firstHourRow?.style.borderColor).toBe(normalizeCssColor(COLOR.WEEKDAY_COLOR_BORDER_SUB));
  });

  it("終日イベントの色トークンをそのまま使う", () => {
    const allDayEvent = createEvent({ id: "all-day-event", title: "All day event", startsAt: new Date(2026, 0, 1, 0, 0), endsAt: new Date(2026, 0, 2, 0, 0), isAllDay: true, accentColor: ALL_DAY_ACCENT_COLOR });
    const tokens = generateColorTokens(ALL_DAY_ACCENT_COLOR);

    renderWeekDayGrid([allDayEvent]);

    const allDayChip = screen.getByText("All day event");

    expect(allDayChip.style.background).toBe(normalizeCssColor(tokens.bg));
    expect(allDayChip.style.color).toBe(normalizeCssColor(tokens.text));
  });
});
