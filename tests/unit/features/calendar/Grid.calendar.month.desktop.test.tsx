// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { addDays, format } from "date-fns";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GridCalendarMonthDesktop } from "@/features/calendar/grid/Grid.calendar.month.desktop";

type CalendarMonthGridDay = {
  date: Date; key: string; dayOfMonth: number; isCurrentMonth: boolean; };

type CalendarMonthGridWeek = {
  key: string; days: CalendarMonthGridDay[]; };

const MONTH_ROW_HEIGHT = 120;

const buildMonthWeek = (weekStart: Date): CalendarMonthGridWeek => ({
  key: format(weekStart, "yyyy-MM-dd"),
  days: Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);

    return {
      date,
      key: format(date, "yyyy-MM-dd"),
      dayOfMonth: date.getDate(),
      isCurrentMonth: true,
    };
  }),
});

const renderMonthGrid = () => render(
  <GridCalendarMonthDesktop
    today={new Date(2026, 10, 1)}
    selectedDate={new Date(2026, 11, 2)}
    visibleEvents={[]}
    monthWeeks={[buildMonthWeek(new Date(2026, 11, 1))]}
    monthRowHeight={MONTH_ROW_HEIGHT}
    topSpacerHeight={0}
    bottomSpacerHeight={0}
    scrollHoverDayKey={null}
    onSelectDate={vi.fn()}
  />,
);

describe("GridCalendarMonthDesktop", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("月注記を日付番号と同じ横並びコンテナ内に表示する", () => {
    renderMonthGrid();

    const dayButton = screen.getByRole("button", { name: "2026年12月1日" });
    const dayNumber = within(dayButton).getByText("1");
    const monthAnnotation = within(dayButton).getByText("12月");
    const dayHeader = dayNumber.parentElement;

    expect(dayHeader).not.toBeNull();
    expect(monthAnnotation.parentElement).toBe(dayHeader);
    expect(dayHeader?.className).toContain("flex");
    expect(dayHeader?.className).toContain("items-center");
    expect(dayHeader?.className).toContain("whitespace-nowrap");
    expect(monthAnnotation.className).not.toContain("absolute");
  });
});
