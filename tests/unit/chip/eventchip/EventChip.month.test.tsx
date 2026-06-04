// @vitest-environment jsdom

import React, { type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarEventChipMonth } from "@/chip/eventchip/EventChip.month";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

vi.mock("@/chip/toolchip/HoverMonthEventTooltip", () => ({
  HoverMonthEventTooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const ALL_DAY_EVENT: GoogleCalendarEvent = {
  id: "all-day-event-1",
  calendarId: "calendar-1",
  title: "燃えないごみ",
  startsAt: new Date("2026-06-03T00:00:00+09:00"),
  endsAt: new Date("2026-06-04T00:00:00+09:00"),
  isAllDay: true,
  accentColor: "#6b6bb0",
};

const getMonthChipElement = (title = ALL_DAY_EVENT.title): HTMLElement => {
  const chipElement = screen.getByText(title).closest('[data-calendar-event-chip="month"]');

  if (!(chipElement instanceof HTMLElement)) throw new Error("month event chip was not rendered");

  return chipElement;
};

afterEach(() => {
  cleanup();
});

describe("CalendarEventChipMonth vertical spacing", () => {
  it("終日チップは上下 padding を 2px に固定する", () => {
    render(<CalendarEventChipMonth event={ALL_DAY_EVENT} showTimeLabel={false} />);

    const chipElement = getMonthChipElement();

    expect(chipElement.className).toContain("pt-[2px]");
    expect(chipElement.className).toContain("pb-[2px]");
    expect(chipElement.className).not.toContain("pb-1");
  });

  it("時刻を非表示にした終日チップは1px下げて上下の見た目の余白を揃える", () => {
    render(<CalendarEventChipMonth event={ALL_DAY_EVENT} showTimeLabel={false} />);

    const chipElement = getMonthChipElement();

    expect(chipElement.className).toContain("translate-y-px");
  });

  it("時刻を表示する通常の月チップには終日行用の位置補正を入れない", () => {
    render(<CalendarEventChipMonth event={ALL_DAY_EVENT} showTimeLabel />);

    const chipElement = getMonthChipElement();

    expect(chipElement.className).not.toContain("translate-y-px");
  });
});
