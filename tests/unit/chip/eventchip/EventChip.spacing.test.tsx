// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
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

const normalizeCssColor = (color: string): string => {
  const element = document.createElement("div");
  element.style.color = color;

  return element.style.color;
};

const getWeekdayChipElement = (): HTMLElement => {
  const titleElement = screen.getAllByText(TIMED_EVENT.title).find((element) => element.parentElement?.className.includes("z-10") && element.parentElement?.className.includes("rounded-md"));

  if (!titleElement?.parentElement) throw new Error("weekday event chip was not rendered");

  return titleElement.parentElement;
};

const getWeekdayChipRootElement = (): HTMLElement => {
  const chipElement = getWeekdayChipElement();
  const rootElement = chipElement.parentElement;

  if (!(rootElement instanceof HTMLElement)) throw new Error("weekday event chip root was not rendered");

  return rootElement;
};

const getWeekdayLineMaskElement = (): HTMLElement => {
  const lineMaskElement = getWeekdayChipRootElement().querySelector('[aria-hidden="true"].bg-white');

  if (!(lineMaskElement instanceof HTMLElement)) throw new Error("weekday event chip line mask was not rendered");

  return lineMaskElement;
};

const getWeekdayVisibleTitleElement = (): HTMLElement => {
  const titleElement = screen.getAllByText(TIMED_EVENT.title).find((element) => element.parentElement?.className.includes("z-10") && element.parentElement?.className.includes("rounded-md"));

  if (!(titleElement instanceof HTMLElement)) throw new Error("weekday event title was not rendered");

  return titleElement;
};

const getListTitleElement = (): HTMLElement => {
  const titleElement = screen.getAllByText(TIMED_EVENT.title).find((element) => element.className.includes("mt-[0.5px]"));

  if (!(titleElement instanceof HTMLElement)) throw new Error("list event title was not rendered");

  return titleElement;
};

const getWeekdayTimeElement = (container: HTMLElement): HTMLElement => {
  const timeElement = Array.from(container.querySelectorAll("span")).find((element) => element.className.includes("tabular-nums"));

  if (!(timeElement instanceof HTMLElement)) throw new Error("weekday event time was not rendered");

  return timeElement;
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
  cleanup();
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

    const titleElement = getListTitleElement();

    expect(titleElement.className).toContain("mt-[0.5px]");
    expect(titleElement.className).not.toContain("mt-0.5");
  });

  it("リスト表示と週表示のタイトルと時刻の間隔を一致させる", () => {
    const { unmount } = render(<CalendarEventChipWeekday event={TIMED_EVENT} />);
    const weekdaySpacing = getClassTokenValue(getWeekdayChipElement().className, "gap-");

    unmount();
    render(<CalendarEventChipList event={TIMED_EVENT} />);

    const listSpacing = getClassTokenValue(getListTitleElement().className, "mt-");

    expect(listSpacing).toBe(weekdaySpacing);
  });
});

describe("weekday event chip grid line mask", () => {
  it("チップ本体の下に白い line mask を置いてグリッド線だけを隠す", () => {
    render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    const rootElement = getWeekdayChipRootElement();
    const lineMaskElement = getWeekdayLineMaskElement();
    const chipElement = getWeekdayChipElement();

    expect(rootElement.className).toContain("relative");
    expect(rootElement.className).toContain("isolate");
    expect(lineMaskElement.className).toContain("pointer-events-none");
    expect(lineMaskElement.className).toContain("absolute");
    expect(lineMaskElement.className).toContain("inset-0");
    expect(lineMaskElement.className).toContain("rounded-md");
    expect(lineMaskElement.className).toContain("bg-white");
    expect(lineMaskElement.nextElementSibling).toBe(chipElement);
    expect(chipElement.className).toContain("relative");
    expect(chipElement.className).toContain("z-10");
  });

  it("チップ本体の色トークンと透明度は line mask に移さず維持する", () => {
    const tokens = generateColorTokens(TIMED_EVENT.accentColor);

    render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    const lineMaskElement = getWeekdayLineMaskElement();
    const chipElement = getWeekdayChipElement();

    expect(lineMaskElement.getAttribute("style")).toBeNull();
    expect(chipElement.style.background).toBe(tokens.bg);
    expect(chipElement.style.color).toBe(normalizeCssColor(tokens.text));
  });
});

describe("weekday event chip text clipping", () => {
  it("通常チップの 1 行タイトルは -webkit-line-clamp を使わず固定 line-height で表示する", () => {
    render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    const titleElement = getWeekdayVisibleTitleElement();

    expect(titleElement.className).toContain("leading-[17px]");
    expect(titleElement.style.display).toBe("block");
    expect(titleElement.style.whiteSpace).toBe("nowrap");
    expect(titleElement.style.textOverflow).toBe("ellipsis");
    expect(titleElement.style.WebkitLineClamp).toBe("");
  });

  it("通常チップの時刻も固定 line-height で表示する", () => {
    const { container } = render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    const timeElement = getWeekdayTimeElement(container);

    expect(timeElement.className).toContain("leading-[16px]");
  });

  it("通常チップの時刻は横幅が狭い時に折り返せる", () => {
    const { container } = render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    const timeElement = getWeekdayTimeElement(container);

    expect(timeElement.className).toContain("whitespace-normal");
    expect(timeElement.className).toContain("break-words");
    expect(timeElement.className).not.toContain("whitespace-nowrap");
  });
});
