import { describe, expect, it } from "vitest";
import { getCalendarEventLevels, getCalendarEventSegment } from "../../packages/core/src/calendar/eventLevels";
import { layoutCalendarTimeGridEvents } from "../../packages/core/src/calendar/timeGridLayout";
import type { CalendarEvent } from "../../packages/core/src/calendar/calendarEvent.types";

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
