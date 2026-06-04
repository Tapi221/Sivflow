// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { createCalendarEventsScopeKey, TRANSIENT_EMPTY_CALENDAR_EVENTS_HOLD_MS, useTransientEmptyCalendarEvents } from "@/features/calendar/useTransientEmptyCalendarEvents";

const createEvent = (id: string): GoogleCalendarEvent => ({
  id,
  calendarId: "primary",
  accentColor: "#4285f4",
  title: id,
  startsAt: new Date("2026-05-04T10:00:00.000Z"),
  endsAt: new Date("2026-05-04T11:00:00.000Z"),
  isAllDay: false,
});

const SCOPE_KEY = createCalendarEventsScopeKey(
  new Date("2026-05-04T00:00:00.000Z"),
  new Date("2026-05-11T00:00:00.000Z"),
);

const NEXT_SCOPE_KEY = createCalendarEventsScopeKey(
  new Date("2026-05-11T00:00:00.000Z"),
  new Date("2026-05-18T00:00:00.000Z"),
);

describe("useTransientEmptyCalendarEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("same scope empty events are held briefly", () => {
    const event = createEvent("event-1");
    const { result, rerender } = renderHook(
      ({ events, scopeKey }) => useTransientEmptyCalendarEvents(events, scopeKey),
      { initialProps: { events: [event], scopeKey: SCOPE_KEY } },
    );

    rerender({ events: [], scopeKey: SCOPE_KEY });

    expect(result.current).toEqual([event]);

    act(() => {
      vi.advanceTimersByTime(TRANSIENT_EMPTY_CALENDAR_EVENTS_HOLD_MS);
    });

    expect(result.current).toEqual([]);
  });

  it("different scope empty events are not held", () => {
    const event = createEvent("event-1");
    const { result, rerender } = renderHook(
      ({ events, scopeKey }) => useTransientEmptyCalendarEvents(events, scopeKey),
      { initialProps: { events: [event], scopeKey: SCOPE_KEY } },
    );

    rerender({ events: [], scopeKey: NEXT_SCOPE_KEY });

    expect(result.current).toEqual([]);
  });
});
