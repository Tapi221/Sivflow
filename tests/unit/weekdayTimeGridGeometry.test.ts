import { describe, expect, it } from "vitest";
import { getWeekdayTimedEventFrame, getWeekdayTimedEventPositionStyle } from "../../src/features/calendar/grid/weekdayTimeGridGeometry";
import { WEEKDAY_HOURS, WEEKDAY_MINUTES_PER_HOUR } from "../../src/features/calendar/grid/grid.layout.constants.desktop";
import { layoutCalendarTimeGridEvents } from "../../packages/core/src/calendar/timeGridLayout";
import type { CalendarEvent } from "../../packages/core/src/calendar/calendarEvent.types";
import type { CalendarTimeGridLayoutEntry } from "../../packages/core/src/calendar/timeGridLayout";

const NEXT_DAY_PREVIEW_MINUTES = 30;
const NEXT_DAY_PREVIEW_HOURS = NEXT_DAY_PREVIEW_MINUTES / WEEKDAY_MINUTES_PER_HOUR;
const DEFAULT_MIN_HEIGHT_STYLE = "17.5px";

const buildEvent = ({
  id,
  startsAt,
  endsAt,
}: {
  id: string;
  startsAt: Date;
  endsAt: Date;
}): CalendarEvent => ({
  id,
  calendarId: "calendar-1",
  title: id,
  startsAt,
  endsAt,
  isAllDay: false,
  accentColor: "#2563eb",
});

const getEntryById = (entries: readonly CalendarTimeGridLayoutEntry[], id: string): CalendarTimeGridLayoutEntry => {
  const entry = entries.find((item) => item.event.id === id);

  if (!entry) throw new Error(`Missing layout entry: ${id}`);

  return entry;
};

describe("weekday time grid geometry", () => {
  it("24:00 をまたぐ当日側 event は minHeight を抑制して下端からはみ出さない", () => {
    const [entry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "crosses-midnight",
          startsAt: new Date(2026, 3, 12, 23, 55),
          endsAt: new Date(2026, 3, 13, 0, 20),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
    });

    const frame = getWeekdayTimedEventFrame(entry);
    const defaultStyle = getWeekdayTimedEventPositionStyle(entry);
    const suppressedStyle = getWeekdayTimedEventPositionStyle(entry, WEEKDAY_HOURS, { suppressMinHeight: entry.endsAfterRange });

    expect(entry.endsAfterRange).toBe(true);
    expect(frame.topHours).toBeCloseTo(23 + 55 / 60, 6);
    expect(frame.heightHours).toBeCloseTo(5 / 60, 6);
    expect(defaultStyle.minHeight).toBe(DEFAULT_MIN_HEIGHT_STYLE);
    expect(suppressedStyle.minHeight).toBe("0px");
  });

  it("24:00 以降プレビューは 30 分範囲で 0 時台 event の位置と高さを計算する", () => {
    const [entry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "next-day-preview",
          startsAt: new Date(2026, 3, 13, 0, 0),
          endsAt: new Date(2026, 3, 13, 0, 30),
        }),
      ],
      rangeStart: new Date(2026, 3, 13, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 30),
      layoutMode: "no-overlap",
    });

    const frame = getWeekdayTimedEventFrame(entry, NEXT_DAY_PREVIEW_HOURS);
    const style = getWeekdayTimedEventPositionStyle(entry, NEXT_DAY_PREVIEW_HOURS);

    expect(entry.startsBeforeRange).toBe(false);
    expect(entry.endsAfterRange).toBe(false);
    expect(frame.topHours).toBe(0);
    expect(frame.heightHours).toBeCloseTo(0.5, 6);
    expect(style.top).toBe("calc(0 * var(--calendar-hour-row-height))");
    expect(style.height).toBe("calc(0.5 * var(--calendar-hour-row-height) - 0.5px)");
    expect(style.minHeight).toBe(DEFAULT_MIN_HEIGHT_STYLE);
  });

  it("24:00 以降プレビューは前日から継続する event を高さ 0 にして重複表示しない", () => {
    const [entry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "carry-over-preview",
          startsAt: new Date(2026, 3, 12, 23, 54),
          endsAt: new Date(2026, 3, 13, 0, 34),
        }),
      ],
      rangeStart: new Date(2026, 3, 13, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 30),
      layoutMode: "no-overlap",
    });

    const frame = getWeekdayTimedEventFrame(entry, NEXT_DAY_PREVIEW_HOURS);
    const style = getWeekdayTimedEventPositionStyle(entry, NEXT_DAY_PREVIEW_HOURS);

    expect(entry.startsBeforeRange).toBe(true);
    expect(entry.endsAfterRange).toBe(true);
    expect(frame.topHours).toBe(0);
    expect(frame.heightHours).toBeCloseTo(0.5, 6);
    expect(style.height).toBe("0px");
    expect(style.minHeight).toBe("0px");
    expect(style.overflow).toBe("hidden");
    expect(style.pointerEvents).toBe("none");
  });

  it("24:00 前後の同じ長さの event は同じ表示高さと minHeight になる", () => {
    const [beforeMidnightEntry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "before-midnight",
          startsAt: new Date(2026, 3, 12, 23, 0),
          endsAt: new Date(2026, 3, 12, 23, 30),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
    });
    const [afterMidnightEntry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "after-midnight",
          startsAt: new Date(2026, 3, 13, 0, 0),
          endsAt: new Date(2026, 3, 13, 0, 30),
        }),
      ],
      rangeStart: new Date(2026, 3, 13, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 30),
      layoutMode: "no-overlap",
    });

    const beforeMidnightFrame = getWeekdayTimedEventFrame(beforeMidnightEntry);
    const afterMidnightFrame = getWeekdayTimedEventFrame(afterMidnightEntry, NEXT_DAY_PREVIEW_HOURS);
    const beforeMidnightStyle = getWeekdayTimedEventPositionStyle(beforeMidnightEntry);
    const afterMidnightStyle = getWeekdayTimedEventPositionStyle(afterMidnightEntry, NEXT_DAY_PREVIEW_HOURS);

    expect(beforeMidnightFrame.heightHours).toBeCloseTo(afterMidnightFrame.heightHours, 6);
    expect(beforeMidnightStyle.height).toBe(afterMidnightStyle.height);
    expect(beforeMidnightStyle.minHeight).toBe(afterMidnightStyle.minHeight);
  });

  it("24:00 以降プレビューは 0:30 以降の event を範囲外として扱う", () => {
    const entries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "after-preview",
          startsAt: new Date(2026, 3, 13, 0, 30),
          endsAt: new Date(2026, 3, 13, 1, 0),
        }),
      ],
      rangeStart: new Date(2026, 3, 13, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 30),
      layoutMode: "no-overlap",
    });

    expect(entries).toEqual([]);
  });

  it("次の event までの隙間が小さい場合は minHeight をその範囲内に制限する", () => {
    const [entry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "short-a",
          startsAt: new Date(2026, 3, 12, 9, 0),
          endsAt: new Date(2026, 3, 12, 9, 5),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
    });
    const style = getWeekdayTimedEventPositionStyle(entry, WEEKDAY_HOURS, { maxMinHeightHours: 6 / WEEKDAY_MINUTES_PER_HOUR });

    expect(style.minHeight).toBe("max(0px, min(17.5px, calc(0.1 * var(--calendar-hour-row-height) - 0.5px)))");
  });

  it("24:00 前後の overlap event は同じ横並び column を割り当てる", () => {
    const beforeMidnightEntries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "before-a",
          startsAt: new Date(2026, 3, 12, 23, 0),
          endsAt: new Date(2026, 3, 12, 23, 20),
        }),
        buildEvent({
          id: "before-b",
          startsAt: new Date(2026, 3, 12, 23, 10),
          endsAt: new Date(2026, 3, 12, 23, 30),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
    });
    const afterMidnightEntries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "after-a",
          startsAt: new Date(2026, 3, 13, 0, 0),
          endsAt: new Date(2026, 3, 13, 0, 20),
        }),
        buildEvent({
          id: "after-b",
          startsAt: new Date(2026, 3, 13, 0, 10),
          endsAt: new Date(2026, 3, 13, 0, 30),
        }),
      ],
      rangeStart: new Date(2026, 3, 13, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 30),
      layoutMode: "no-overlap",
    });

    const beforeA = getEntryById(beforeMidnightEntries, "before-a");
    const beforeB = getEntryById(beforeMidnightEntries, "before-b");
    const afterA = getEntryById(afterMidnightEntries, "after-a");
    const afterB = getEntryById(afterMidnightEntries, "after-b");

    expect(beforeA.columnIndex).toBe(afterA.columnIndex);
    expect(beforeA.columnCount).toBe(afterA.columnCount);
    expect(beforeA.style.width).toBe(afterA.style.width);
    expect(beforeA.style.xOffset).toBe(afterA.style.xOffset);
    expect(beforeB.columnIndex).toBe(afterB.columnIndex);
    expect(beforeB.columnCount).toBe(afterB.columnCount);
    expect(beforeB.style.width).toBe(afterB.style.width);
    expect(beforeB.style.xOffset).toBe(afterB.style.xOffset);
  });
});
