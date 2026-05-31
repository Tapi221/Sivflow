// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

const TIMED_EVENT: GoogleCalendarEvent = {
  id: "event-1",
  calendarId: "calendar-1",
  title: "講義・波動復習",
  startsAt: new Date("2026-05-31T17:07:00+09:00"),
  endsAt: new Date("2026-05-31T19:14:00+09:00"),
  isAllDay: false,
  accentColor: "#2f9f6b",
};

const getClassTokenValue = (className: string, prefix: string): string => {
  const token = className.split(/\s+/).find((classToken) => classToken.startsWith(prefix));

  if (!token) throw new Error(`${prefix} spacing token was not found`);

  return token.slice(prefix.length);
};

const getWeekdayChipElement = (): HTMLElement => {
  const titleElement = screen.getAllByText(TIMED_EVENT.title).find((element) => element.parentElement?.className.includes("rounded-md"));

  if (!titleElement?.parentElement) throw new Error("weekday event chip was not rendered");

  return titleElement.parentElement;
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);

    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("ResizeObserver", undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("event chip title/time spacing", () => {
  it("週表示の通常チップはタイトルと時刻の間隔を gap-[0.5px] にする", () => {
    render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    const chipElement = getWeekdayChipElement();

    expect(chipElement.className).toContain("gap-[0.5px]");
    expect(chipElement.className).not.toContain("gap-0.5");
    expect(chipElement.className).not.toContain("gap-1");
  });

  it("リスト表示のチップもタイトルと時刻の間隔を mt-[0.5px] にする", () => {
    render(<CalendarEventChipList event={TIMED_EVENT} />);

    const titleElement = screen.getByText(TIMED_EVENT.title);

    expect(titleElement.className).toContain("mt-[0.5px]");
    expect(titleElement.className).not.toContain("mt-0.5");
  });

  it("リスト表示と週表示のタイトルと時刻の間隔を一致させる", () => {
    const { unmount } = render(<CalendarEventChipWeekday event={TIMED_EVENT} />);
    const weekdaySpacing = getClassTokenValue(getWeekdayChipElement().className, "gap-");

    unmount();
    render(<CalendarEventChipList event={TIMED_EVENT} />);

    const listTitleElement = screen.getByText(TIMED_EVENT.title);
    const listSpacing = getClassTokenValue(listTitleElement.className, "mt-");

    expect(listSpacing).toBe(weekdaySpacing);
  });
});
