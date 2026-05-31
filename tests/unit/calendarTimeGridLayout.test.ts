import { describe, expect, it } from "vitest";
import { getWeekdayTimedEventFrame, getWeekdayTimedEventPositionStyle, isCompactWeekdayTimedEntry } from "../../src/features/calendar/grid/weekdayTimeGridGeometry";
import { getCalendarEventLevels, getCalendarEventSegment } from "../../packages/core/src/calendar/eventLevels";
import { layoutCalendarTimeGridEvents } from "../../packages/core/src/calendar/timeGridLayout";
import type { CalendarEvent } from "../../packages/core/src/calendar/calendarEvent.types";
import type { CalendarTimeGridLayoutEntry } from "../../packages/core/src/calendar/timeGridLayout";

const buildEvent = ({
  id,
  startsAt,
  endsAt,
  isAllDay = false,
}: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay?: boolean;
}): CalendarEvent => ({
  id,
  calendarId: "calendar-1",
  title: id,
  startsAt,
  endsAt,
  isAllDay,
  accentColor: "#2563eb",
});

const getEntryById = (entries: readonly CalendarTimeGridLayoutEntry[], id: string): CalendarTimeGridLayoutEntry => {
  const entry = entries.find((item) => item.event.id === id);

  if (!entry) throw new Error(`Missing layout entry: ${id}`);

  return entry;
};

describe("layoutCalendarTimeGridEvents", () => {
  it("時刻イベントを top / height の percentage に変換する", () => {
    const [entry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "event-1",
          startsAt: new Date(2026, 3, 12, 12, 0),
          endsAt: new Date(2026, 3, 12, 13, 0),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 8, 0),
      rangeEnd: new Date(2026, 3, 12, 20, 0),
    });

    expect(entry.style.top).toBeCloseTo(33.333, 3);
    expect(entry.style.height).toBeCloseTo(8.333, 3);
    expect(entry.style.xOffset).toBe(0);
  });

  it("短いイベントも実時間どおりの height にする", () => {
    const [entry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "short-event",
          startsAt: new Date(2026, 3, 12, 0, 0),
          endsAt: new Date(2026, 3, 12, 0, 15),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
    });

    expect(entry.style.top).toBe(0);
    expect(entry.style.height).toBeCloseTo(1.041_666, 6);
  });

  it("weekday 表示の chip 高さを event duration と同じ時間長にする", () => {
    const [shortEntry, longEntry] = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "0-15",
          startsAt: new Date(2026, 3, 12, 0, 0),
          endsAt: new Date(2026, 3, 12, 0, 15),
        }),
        buildEvent({
          id: "33-140",
          startsAt: new Date(2026, 3, 12, 0, 33),
          endsAt: new Date(2026, 3, 12, 2, 20),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
    });

    const shortFrame = getWeekdayTimedEventFrame(shortEntry);
    const longFrame = getWeekdayTimedEventFrame(longEntry);
    const shortStyle = getWeekdayTimedEventPositionStyle(shortEntry);
    const longStyle = getWeekdayTimedEventPositionStyle(longEntry);

    expect(shortFrame.heightHours).toBeCloseTo(15 / 60, 6);
    expect(longFrame.heightHours).toBeCloseTo(107 / 60, 6);
    expect(longFrame.heightHours / shortFrame.heightHours).toBeCloseTo(107 / 15, 6);
    expect(shortStyle.height).toBe("calc(0.25 * var(--calendar-hour-row-height))");
    expect(longStyle.height).toBe("calc(1.7833333333333332 * var(--calendar-hour-row-height))");
  });

  it("weekday 表示の chip top を開始時刻と同じ時間位置にする", () => {
    const entries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "start-0033",
          startsAt: new Date(2026, 3, 12, 0, 33),
          endsAt: new Date(2026, 3, 12, 1, 0),
        }),
        buildEvent({
          id: "start-0224",
          startsAt: new Date(2026, 3, 12, 2, 24),
          endsAt: new Date(2026, 3, 12, 2, 37),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
    });

    expect(getWeekdayTimedEventFrame(getEntryById(entries, "start-0033")).topHours).toBeCloseTo(33 / 60, 6);
    expect(getWeekdayTimedEventFrame(getEntryById(entries, "start-0224")).topHours).toBeCloseTo(144 / 60, 6);
  });

  it("日跨ぎイベントを表示日の範囲に clip して top / height に反映する", () => {
    const entries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "starts-before-range",
          startsAt: new Date(2026, 3, 11, 23, 30),
          endsAt: new Date(2026, 3, 12, 1, 0),
        }),
        buildEvent({
          id: "ends-after-range",
          startsAt: new Date(2026, 3, 12, 23, 0),
          endsAt: new Date(2026, 3, 13, 1, 0),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
    });

    const startsBeforeRange = getEntryById(entries, "starts-before-range");
    const endsAfterRange = getEntryById(entries, "ends-after-range");

    expect(startsBeforeRange.startsBeforeRange).toBe(true);
    expect(startsBeforeRange.endsAfterRange).toBe(false);
    expect(getWeekdayTimedEventFrame(startsBeforeRange).topHours).toBe(0);
    expect(getWeekdayTimedEventFrame(startsBeforeRange).heightHours).toBeCloseTo(1, 6);
    expect(endsAfterRange.startsBeforeRange).toBe(false);
    expect(endsAfterRange.endsAfterRange).toBe(true);
    expect(getWeekdayTimedEventFrame(endsAfterRange).topHours).toBeCloseTo(23, 6);
    expect(getWeekdayTimedEventFrame(endsAfterRange).heightHours).toBeCloseTo(1, 6);
  });

  it("overlap mode では重なる event に横幅と xOffset を割り当てる", () => {
    const entries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "event-1",
          startsAt: new Date(2026, 3, 12, 9, 0),
          endsAt: new Date(2026, 3, 12, 11, 0),
        }),
        buildEvent({
          id: "event-2",
          startsAt: new Date(2026, 3, 12, 10, 0),
          endsAt: new Date(2026, 3, 12, 12, 0),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 8, 0),
      rangeEnd: new Date(2026, 3, 12, 20, 0),
      layoutMode: "overlap",
    });

    expect(entries).toHaveLength(2);
    expect(entries[0].style.xOffset).toBe(0);
    expect(entries[1].style.xOffset).toBeGreaterThan(0);
    expect(entries[0].style.width).toBeGreaterThan(entries[1].style.width);
  });

  it("no-overlap mode では重なる event を column に分ける", () => {
    const entries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "event-1",
          startsAt: new Date(2026, 3, 12, 9, 0),
          endsAt: new Date(2026, 3, 12, 11, 0),
        }),
        buildEvent({
          id: "event-2",
          startsAt: new Date(2026, 3, 12, 10, 0),
          endsAt: new Date(2026, 3, 12, 12, 0),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 8, 0),
      rangeEnd: new Date(2026, 3, 12, 20, 0),
      layoutMode: "no-overlap",
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.columnIndex).sort()).toEqual([0, 1]);
    expect(entries[0].columnCount).toBe(2);
    expect(entries[0].style.width).toBe(50);
    expect(entries[1].style.xOffset).toBe(50);
  });

  it("連鎖 overlap では直接重ならない event だけ同じ column を再利用する", () => {
    const entries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "a",
          startsAt: new Date(2026, 3, 12, 9, 0),
          endsAt: new Date(2026, 3, 12, 10, 0),
        }),
        buildEvent({
          id: "b",
          startsAt: new Date(2026, 3, 12, 9, 30),
          endsAt: new Date(2026, 3, 12, 10, 30),
        }),
        buildEvent({
          id: "c",
          startsAt: new Date(2026, 3, 12, 10, 0),
          endsAt: new Date(2026, 3, 12, 11, 0),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
    });

    const a = getEntryById(entries, "a");
    const b = getEntryById(entries, "b");
    const c = getEntryById(entries, "c");

    expect(a.columnCount).toBe(2);
    expect(b.columnCount).toBe(2);
    expect(c.columnCount).toBe(2);
    expect(a.style.xOffset).toBe(0);
    expect(b.style.xOffset).toBe(50);
    expect(c.style.xOffset).toBe(0);
    expect(a.style.width).toBe(50);
    expect(b.style.width).toBe(50);
    expect(c.style.width).toBe(50);
  });

  it("短時間 event の compact 判定を 30 分未満に固定する", () => {
    const entries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "compact-29",
          startsAt: new Date(2026, 3, 12, 9, 0),
          endsAt: new Date(2026, 3, 12, 9, 29),
        }),
        buildEvent({
          id: "normal-30",
          startsAt: new Date(2026, 3, 12, 10, 0),
          endsAt: new Date(2026, 3, 12, 10, 30),
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 0, 0),
      rangeEnd: new Date(2026, 3, 13, 0, 0),
      layoutMode: "no-overlap",
    });

    expect(isCompactWeekdayTimedEntry(getEntryById(entries, "compact-29"))).toBe(true);
    expect(isCompactWeekdayTimedEntry(getEntryById(entries, "normal-30"))).toBe(false);
  });

  it("all-day event はデフォルトで time grid から除外する", () => {
    const entries = layoutCalendarTimeGridEvents({
      events: [
        buildEvent({
          id: "all-day",
          startsAt: new Date(2026, 3, 12, 0, 0),
          endsAt: new Date(2026, 3, 13, 0, 0),
          isAllDay: true,
        }),
      ],
      rangeStart: new Date(2026, 3, 12, 8, 0),
      rangeEnd: new Date(2026, 3, 12, 20, 0),
    });

    expect(entries).toEqual([]);
  });
});

describe("calendar event levels", () => {
  it("週範囲内の event segment を left / right / span に変換する", () => {
    const range = Array.from({ length: 7 }, (_, index) => new Date(2026, 3, 12 + index));
    const segment = getCalendarEventSegment(
      buildEvent({
        id: "multi-day",
        startsAt: new Date(2026, 3, 13, 9, 0),
        endsAt: new Date(2026, 3, 16, 10, 0),
      }),
      range,
    );

    expect(segment).not.toBeNull();
    expect(segment?.left).toBe(2);
    expect(segment?.right).toBe(5);
    expect(segment?.span).toBe(4);
  });

  it("重なる event segment を別 level に積む", () => {
    const range = Array.from({ length: 7 }, (_, index) => new Date(2026, 3, 12 + index));
    const segments = [
      getCalendarEventSegment(
        buildEvent({
          id: "event-1",
          startsAt: new Date(2026, 3, 12, 9, 0),
          endsAt: new Date(2026, 3, 14, 10, 0),
        }),
        range,
      ),
      getCalendarEventSegment(
        buildEvent({
          id: "event-2",
          startsAt: new Date(2026, 3, 13, 9, 0),
          endsAt: new Date(2026, 3, 15, 10, 0),
        }),
        range,
      ),
      getCalendarEventSegment(
        buildEvent({
          id: "event-3",
          startsAt: new Date(2026, 3, 16, 9, 0),
          endsAt: new Date(2026, 3, 17, 10, 0),
        }),
        range,
      ),
    ].filter((segment): segment is NonNullable<typeof segment> => segment !== null);
    const { levels } = getCalendarEventLevels(segments);

    expect(levels).toHaveLength(2);
    expect(levels[0].map((segment) => segment.event.id)).toEqual(["event-1", "event-3"]);
    expect(levels[1].map((segment) => segment.event.id)).toEqual(["event-2"]);
  });
});
