// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

const LONG_TITLE_EVENT: GoogleCalendarEvent = {
  ...TIMED_EVENT,
  id: "event-long-title",
  title: "かなり長い予定タイトルでも週表示のイベントチップでは必ず1行で省略表示する",
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

const getWeekdayRenderedChipElement = (container: HTMLElement): HTMLElement => {
  const chipElement = container.querySelector('[data-calendar-event-chip="weekday"]');

  if (!(chipElement instanceof HTMLElement)) throw new Error("weekday event chip was not rendered");

  return chipElement;
};

const getWeekdayChipElement = (title = TIMED_EVENT.title): HTMLElement => {
  const titleElement = screen.getByText(title);
  const chipElement = titleElement.closest('[data-calendar-event-chip="weekday"]');

  if (!(chipElement instanceof HTMLElement)) throw new Error("weekday event chip was not rendered");

  return chipElement;
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

const getWeekdayVisibleTitleElement = (title = TIMED_EVENT.title): HTMLElement => {
  const titleElement = screen.getByText(title);

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

afterEach(() => {
  cleanup();
});

describe("event chip title/time spacing", () => {
  it("週表示のチップはタイトルと時刻を1行で横並びにする", () => {
    render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    const chipElement = getWeekdayChipElement();

    expect(chipElement.className).toContain("items-center");
    expect(chipElement.className).toContain("gap-1");
    expect(chipElement.className).toContain("py-[1px]");
    expect(chipElement.className).not.toContain("flex-col");
    expect(chipElement.className).not.toContain("gap-[0.5px]");
    expect(chipElement.className).not.toContain("py-[2px]");
  });

  it("リスト表示のチップもタイトルと時刻の間隔を mt-[0.5px] にする", () => {
    render(<CalendarEventChipList event={TIMED_EVENT} />);

    const titleElement = getListTitleElement();

    expect(titleElement.className).toContain("mt-[0.5px]");
    expect(titleElement.className).not.toContain("mt-0.5");
  });

  it("リスト表示と週表示でタイトルと時刻の間隔を小さい値に揃える", () => {
    const { unmount } = render(<CalendarEventChipWeekday event={TIMED_EVENT} />);
    const weekdaySpacing = getClassTokenValue(getWeekdayChipElement().className, "gap-");

    unmount();
    render(<CalendarEventChipList event={TIMED_EVENT} />);

    const listSpacing = getClassTokenValue(getListTitleElement().className, "mt-");

    expect(weekdaySpacing).toBe("1");
    expect(listSpacing).toBe("[0.5px]");
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
  it("長いタイトルでも -webkit-line-clamp を使わず1行省略で表示する", () => {
    render(<CalendarEventChipWeekday event={LONG_TITLE_EVENT} />);

    const titleElement = getWeekdayVisibleTitleElement(LONG_TITLE_EVENT.title);

    expect(titleElement.className).toContain("flex-1");
    expect(titleElement.className).toContain("text-ellipsis");
    expect(titleElement.className).toContain("whitespace-nowrap");
    expect(titleElement.className).toContain("leading-[17px]");
    expect(titleElement.className).not.toContain("whitespace-normal");
    expect(titleElement.className).not.toContain("break-words");
    expect(titleElement.style.WebkitLineClamp).toBe("");
  });

  it("時刻も折り返さず1行で表示する", () => {
    const { container } = render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    const timeElement = getWeekdayTimeElement(container);

    expect(timeElement.className).toContain("shrink-0");
    expect(timeElement.className).toContain("whitespace-nowrap");
    expect(timeElement.className).toContain("leading-[16px]");
    expect(timeElement.className).not.toContain("whitespace-normal");
    expect(timeElement.className).not.toContain("break-words");
  });

  it("単行表示だけを描画し、測定用要素や最終行時刻レイアウトを作らない", () => {
    const { container } = render(<CalendarEventChipWeekday event={LONG_TITLE_EVENT} />);

    const chipElement = getWeekdayRenderedChipElement(container);
    const visibleChildren = Array.from(chipElement.children).filter((element) => element instanceof HTMLElement && !element.className.includes("invisible"));

    expect(chipElement.querySelector(".invisible")).toBeNull();
    expect(chipElement.querySelector(".items-baseline")).toBeNull();
    expect(visibleChildren).toHaveLength(2);
    expect(visibleChildren[0]?.textContent).toBe(LONG_TITLE_EVENT.title);
    expect(visibleChildren[1]?.textContent).toContain("~");
  });
});
