// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type WeekdayChipLayoutStubOptions = {
  chipHeight: number;
  chipWidth: number;
  titleHeight?: number;
  titleText: string;
  titleTextWidth: number;
  titleWithTimeHeight?: number;
  timeTextWidth: number;
};

type ResizeObserverMock = {
  disconnect: () => void;
  observe: (target: Element) => void;
  unobserve: (target: Element) => void;
};

const TIMED_EVENT: GoogleCalendarEvent = {
  id: "event-1",
  calendarId: "calendar-1",
  title: "講義・波動復習",
  startsAt: new Date("2026-05-31T17:07:00+09:00"),
  endsAt: new Date("2026-05-31T19:14:00+09:00"),
  isAllDay: false,
  accentColor: "#2f9f6b",
};
const SHORT_TITLE_EVENT: GoogleCalendarEvent = {
  ...TIMED_EVENT,
  id: "event-short-title",
  title: "→",
  startsAt: new Date("2026-05-31T08:00:00Z"),
  endsAt: new Date("2026-05-31T08:30:00Z"),
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

const isWeekdayChipElement = (element: HTMLElement): boolean => element.className.includes("z-10") && element.className.includes("rounded-md");

const isWeekdayMeasurementElement = (element: HTMLElement): boolean => element.className.includes("invisible") && element.className.includes("absolute") && element.className.includes("rounded-md");

const createLayoutStyles = (element: Element) => ({
  fontFamily: "sans-serif",
  fontSize: element.className.includes("text-[11px]") ? "11px" : "12px",
  fontStyle: "normal",
  fontVariant: "normal",
  fontWeight: element.className.includes("font-semibold") ? "600" : "500",
  gap: element.className.includes("gap-[0.5px]") ? "0.5px" : "0px",
  lineHeight: element.className.includes("leading-[16px]") ? "16px" : element.className.includes("leading-[17px]") ? "17px" : "normal",
  paddingBottom: element.className.includes("py-[2px]") ? "2px" : element.className.includes("py-[1px]") ? "1px" : "0px",
  paddingLeft: element.className.includes("pl-1") ? "4px" : "0px",
  paddingRight: element.className.includes("pr-[1px]") ? "1px" : "0px",
  paddingTop: element.className.includes("py-[2px]") ? "2px" : element.className.includes("py-[1px]") ? "1px" : "0px",
  rowGap: element.className.includes("gap-[0.5px]") ? "0.5px" : "0px",
} as CSSStyleDeclaration);

const findClosestWeekdayChipElement = (element: Element | null): HTMLElement | null => {
  let currentElement = element;

  while (currentElement instanceof HTMLElement) {
    if (isWeekdayChipElement(currentElement)) return currentElement;
    currentElement = currentElement.parentElement;
  }

  return null;
};

const getWeekdayRenderedChipElement = (container: HTMLElement): HTMLElement => {
  const chipElement = container.querySelector('[data-calendar-event-chip="weekday"]');

  if (!(chipElement instanceof HTMLElement)) throw new Error("weekday event chip was not rendered");

  return chipElement;
};

const getWeekdayVisibleContentText = (container: HTMLElement): string => {
  const chipElement = getWeekdayRenderedChipElement(container);

  return Array.from(chipElement.children).filter((element) => !element.className.includes("invisible")).map((element) => element.textContent ?? "").join("");
};

const getWeekdayVisibleLastLineTimeElement = (container: HTMLElement): HTMLElement | null => {
  const chipElement = getWeekdayRenderedChipElement(container);
  const titleElement = Array.from(chipElement.children).find((element): element is HTMLElement => element instanceof HTMLElement && element.tagName.toLowerCase() === "span" && !element.className.includes("invisible"));

  if (!(titleElement instanceof HTMLElement)) return null;

  const timeElement = Array.from(titleElement.querySelectorAll("span")).find((element) => element.className.includes("tabular-nums") && element.textContent?.includes("~"));

  return timeElement instanceof HTMLElement ? timeElement : null;
};

const getWeekdayChipElement = (title = TIMED_EVENT.title): HTMLElement => {
  const chipElement = screen.getAllByText(title).map((element) => findClosestWeekdayChipElement(element)).find((element): element is HTMLElement => element !== null);

  if (!chipElement) throw new Error("weekday event chip was not rendered");

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

const getWeekdayVisibleTitleElement = (): HTMLElement => {
  const titleElement = screen.getAllByText(TIMED_EVENT.title).find((element) => findClosestWeekdayChipElement(element));

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

const getWeekdayInlineRowElement = (title: string): HTMLElement | null => {
  const chipElement = getWeekdayChipElement(title);
  const inlineRowElement = Array.from(chipElement.children).find((element) => element.className.includes("items-baseline"));

  return inlineRowElement instanceof HTMLElement ? inlineRowElement : null;
};

const stubWeekdayChipLayout = ({ chipHeight, chipWidth, titleHeight = 17, titleText, titleTextWidth, titleWithTimeHeight = titleHeight, timeTextWidth }: WeekdayChipLayoutStubOptions) => {
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return isWeekdayChipElement(this) || isWeekdayMeasurementElement(this) ? chipHeight : 0;
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return isWeekdayChipElement(this) || isWeekdayMeasurementElement(this) ? chipWidth : 0;
  });
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
    if (this.className.includes("text-[12px]") && this.textContent?.includes("~")) return titleWithTimeHeight;
    if (this.className.includes("text-[12px]")) return titleHeight;
    if (this.className.includes("text-[11px]")) return 16;

    return 0;
  });

  const canvasContext = {
    font: "",
    measureText: (value: string) => ({ width: value === titleText ? titleTextWidth : timeTextWidth }),
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => canvasContext);
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
  vi.restoreAllMocks();
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

  it("週表示の通常チップは上下 padding を py-[2px] にする", () => {
    render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    const chipElement = getWeekdayChipElement();

    expect(chipElement.className).toContain("py-[2px]");
    expect(chipElement.className).not.toContain("py-[1px]");
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

describe("weekday event chip inline time layout", () => {
  it("タイトル下に時刻を置けない時でもタイトル横に収まる場合は横並びで表示する", () => {
    stubWeekdayChipLayout({ chipHeight: 12, chipWidth: 70, titleText: SHORT_TITLE_EVENT.title, titleTextWidth: 8, timeTextWidth: 40 });

    render(<CalendarEventChipWeekday event={SHORT_TITLE_EVENT} />);

    const inlineRowElement = getWeekdayInlineRowElement(SHORT_TITLE_EVENT.title);

    expect(inlineRowElement).not.toBeNull();
    expect(inlineRowElement?.className).toContain("items-baseline");
    expect(inlineRowElement?.textContent).toContain(SHORT_TITLE_EVENT.title);
    expect(inlineRowElement?.textContent).toContain("~");
    expect(inlineRowElement?.querySelector("span")?.className).toContain("whitespace-nowrap");
  });

  it("横並び表示ではチップ本体の上下 padding を py-[1px] にする", () => {
    stubWeekdayChipLayout({ chipHeight: 12, chipWidth: 70, titleText: SHORT_TITLE_EVENT.title, titleTextWidth: 8, timeTextWidth: 40 });

    render(<CalendarEventChipWeekday event={SHORT_TITLE_EVENT} />);

    const chipElement = getWeekdayChipElement(SHORT_TITLE_EVENT.title);

    expect(getWeekdayInlineRowElement(SHORT_TITLE_EVENT.title)).not.toBeNull();
    expect(chipElement.className).toContain("py-[1px]");
    expect(chipElement.className).not.toContain("py-[2px]");
  });

  it("時刻単体が収まってもタイトルと時刻の合計幅が足りない場合は横並び表示にしない", () => {
    stubWeekdayChipLayout({ chipHeight: 12, chipWidth: 70, titleText: SHORT_TITLE_EVENT.title, titleTextWidth: 40, timeTextWidth: 40 });

    render(<CalendarEventChipWeekday event={SHORT_TITLE_EVENT} />);

    const inlineRowElement = getWeekdayInlineRowElement(SHORT_TITLE_EVENT.title);

    expect(inlineRowElement).toBeNull();
  });

  it("横並び表示に切り替わっても測定基準を変えず、タイトル下表示へ発振しない", async () => {
    const observerCallbacks: ResizeObserverCallback[] = [];
    const resizeObserverConstructor = vi.fn((callback: ResizeObserverCallback): ResizeObserverMock => {
      observerCallbacks.push(callback);

      return {
        disconnect: vi.fn(),
        observe: vi.fn(),
        unobserve: vi.fn(),
      };
    });

    vi.stubGlobal("ResizeObserver", resizeObserverConstructor);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => createLayoutStyles(element));
    stubWeekdayChipLayout({ chipHeight: 36, chipWidth: 70, titleText: SHORT_TITLE_EVENT.title, titleTextWidth: 8, timeTextWidth: 40 });

    render(<CalendarEventChipWeekday event={SHORT_TITLE_EVENT} />);

    await waitFor(() => expect(getWeekdayInlineRowElement(SHORT_TITLE_EVENT.title)).not.toBeNull());

    observerCallbacks.forEach((callback) => callback([], {} as ResizeObserver));

    await waitFor(() => expect(getWeekdayInlineRowElement(SHORT_TITLE_EVENT.title)).not.toBeNull());
    expect(getWeekdayChipElement(SHORT_TITLE_EVENT.title).className).toContain("py-[1px]");
    expect(getWeekdayChipElement(SHORT_TITLE_EVENT.title).textContent).toContain("~");
  });
});

describe("weekday event chip last-line time layout", () => {
  it("タイトル下にも横並びにも時刻を置けない時、タイトル最終行に収まるなら時刻を表示する", () => {
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => createLayoutStyles(element));
    stubWeekdayChipLayout({ chipHeight: 21, chipWidth: 70, titleText: TIMED_EVENT.title, titleTextWidth: 72, titleWithTimeHeight: 17, timeTextWidth: 42 });

    const { container } = render(<CalendarEventChipWeekday event={TIMED_EVENT} />);
    const chipElement = getWeekdayRenderedChipElement(container);
    const lastLineTimeElement = getWeekdayVisibleLastLineTimeElement(container);

    expect(Array.from(chipElement.children).some((element) => element.className.includes("items-baseline"))).toBe(false);
    expect(getWeekdayVisibleContentText(container)).toContain(TIMED_EVENT.title);
    expect(getWeekdayVisibleContentText(container)).toContain("~");
    expect(lastLineTimeElement).not.toBeNull();
    expect(lastLineTimeElement?.className).toContain("ml-1");
    expect(lastLineTimeElement?.className).toContain("inline-block");
    expect(lastLineTimeElement?.className).toContain("whitespace-nowrap");
  });

  it("タイトル最終行にも時刻が収まらない場合は時刻を表示しない", () => {
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => createLayoutStyles(element));
    stubWeekdayChipLayout({ chipHeight: 21, chipWidth: 70, titleText: TIMED_EVENT.title, titleTextWidth: 72, titleWithTimeHeight: 34, timeTextWidth: 42 });

    const { container } = render(<CalendarEventChipWeekday event={TIMED_EVENT} />);

    expect(getWeekdayVisibleContentText(container)).toContain(TIMED_EVENT.title);
    expect(getWeekdayVisibleContentText(container)).not.toContain("~");
    expect(getWeekdayVisibleLastLineTimeElement(container)).toBeNull();
  });
});
