import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { CalendarEventMoveHandler, CalendarGridStyle } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type SampleEventDefinition = { id: string; title: string; startsAt: Date; endsAt: Date; isAllDay?: boolean; accentColor: string };

type CalendarEventUndoSnapshot = {
  event: GoogleCalendarEvent;
};

const SANDBOX_ACCOUNT_ID = "calendar-dnd-sandbox";
const SANDBOX_CALENDAR_ID = "sandbox-calendar";
const SAMPLE_START_DATE = new Date(2026, 5, 1);
const CALENDAR_GRID_STYLE: CalendarGridStyle = { "--calendar-hour-row-height": "72px" };
const SAMPLE_EVENT_DEFINITIONS: readonly SampleEventDefinition[] = [
  { id: "midnight-review", title: "深夜レビュー", startsAt: new Date(2026, 5, 1, 0, 30), endsAt: new Date(2026, 5, 1, 1, 30), accentColor: "#0ea5e9" },
  { id: "early-vocab", title: "早朝英単語", startsAt: new Date(2026, 5, 2, 2, 0), endsAt: new Date(2026, 5, 2, 3, 0), accentColor: "#22c55e" },
  { id: "visible-overlap-a", title: "重なり確認 A", startsAt: new Date(2026, 5, 3, 3, 15), endsAt: new Date(2026, 5, 3, 4, 30), accentColor: "#a78bfa" },
  { id: "visible-overlap-b", title: "重なり確認 B", startsAt: new Date(2026, 5, 3, 3, 45), endsAt: new Date(2026, 5, 3, 4, 15), accentColor: "#ec4899" },
  { id: "morning-visible", title: "朝の移動テスト", startsAt: new Date(2026, 5, 4, 6, 15), endsAt: new Date(2026, 5, 4, 7, 15), accentColor: "#f97316" },
  { id: "morning-review", title: "朝の復習セッション", startsAt: new Date(2026, 5, 1, 9, 0), endsAt: new Date(2026, 5, 1, 10, 15), accentColor: "#38bdf8" },
  { id: "overlap-short", title: "英単語 20 枚", startsAt: new Date(2026, 5, 1, 9, 20), endsAt: new Date(2026, 5, 1, 9, 55), accentColor: "#22c55e" },
  { id: "deck-maintenance", title: "デッキ整理", startsAt: new Date(2026, 5, 2, 10, 0), endsAt: new Date(2026, 5, 2, 11, 30), accentColor: "#a78bfa" },
  { id: "reading-block", title: "PDF 読解", startsAt: new Date(2026, 5, 3, 13, 0), endsAt: new Date(2026, 5, 3, 14, 30), accentColor: "#f97316" },
  { id: "dense-a", title: "復習予定 A", startsAt: new Date(2026, 5, 3, 13, 15), endsAt: new Date(2026, 5, 3, 15, 0), accentColor: "#ec4899" },
  { id: "dense-b", title: "復習予定 B", startsAt: new Date(2026, 5, 3, 13, 45), endsAt: new Date(2026, 5, 3, 14, 15), accentColor: "#eab308" },
  { id: "all-day-note", title: "終日イベントはドラッグ対象外", startsAt: new Date(2026, 5, 4, 0, 0), endsAt: new Date(2026, 5, 5, 0, 0), isAllDay: true, accentColor: "#14b8a6" },
] as const;

const createSampleEvent = (definition: SampleEventDefinition): GoogleCalendarEvent => ({ accountId: SANDBOX_ACCOUNT_ID, calendarId: SANDBOX_CALENDAR_ID, isAllDay: false, ...definition, startsAt: new Date(definition.startsAt), endsAt: new Date(definition.endsAt) });

const cloneEvent = (event: GoogleCalendarEvent): GoogleCalendarEvent => ({ ...event, startsAt: new Date(event.startsAt), endsAt: new Date(event.endsAt) });

const createSampleEvents = (): GoogleCalendarEvent[] => SAMPLE_EVENT_DEFINITIONS.map(createSampleEvent);

const createVisibleDays = (): Date[] => Array.from({ length: 5 }, (_, index) => addDays(startOfDay(SAMPLE_START_DATE), index));

const createCalendarEventUndoSnapshot = (event: GoogleCalendarEvent): CalendarEventUndoSnapshot => ({ event: cloneEvent(event) });

const isSameCalendarEvent = (left: GoogleCalendarEvent, right: GoogleCalendarEvent): boolean => left.id === right.id && left.calendarId === right.calendarId && left.accountId === right.accountId;

const moveEventTime = (targetEvent: GoogleCalendarEvent, sourceEvent: GoogleCalendarEvent, startsAt: Date, endsAt: Date, isAllDay: boolean): GoogleCalendarEvent => {
  if (!isSameCalendarEvent(targetEvent, sourceEvent)) return targetEvent;

  return { ...targetEvent, startsAt: new Date(startsAt), endsAt: new Date(endsAt), isAllDay };
};

const restoreEventTime = (targetEvent: GoogleCalendarEvent, snapshot: CalendarEventUndoSnapshot): GoogleCalendarEvent => {
  if (!isSameCalendarEvent(targetEvent, snapshot.event)) return targetEvent;

  return cloneEvent(snapshot.event);
};

const CalendarDndSandboxPage = () => {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const eventsRef = useRef<GoogleCalendarEvent[]>([]);
  const visibleDays = useMemo(() => createVisibleDays(), []);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>(() => createSampleEvents().map(cloneEvent));

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const handleMoveCalendarEvent = useCallback<CalendarEventMoveHandler>(({ event, startsAt, endsAt, isAllDay }) => {
    const previousEvent = eventsRef.current.find((currentEvent) => isSameCalendarEvent(currentEvent, event));
    if (!previousEvent) return;

    const snapshot = createCalendarEventUndoSnapshot(previousEvent);
    const toastId = `calendar-event-moved-${event.accountId ?? ""}-${event.calendarId}-${event.id}`;

    setEvents((currentEvents) => currentEvents.map((currentEvent) => moveEventTime(currentEvent, event, startsAt, endsAt, isAllDay)));
    toast("予定を移動しました", {
      id: toastId,
      description: previousEvent.title || "Untitled",
      action: {
        label: "元に戻す",
        onClick: () => {
          setEvents((currentEvents) => currentEvents.map((currentEvent) => restoreEventTime(currentEvent, snapshot)));
        },
      },
    });
  }, []);

  const handleReset = useCallback(() => {
    setEvents(createSampleEvents().map(cloneEvent));
    toast.dismiss();
  }, []);

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex h-[calc(100vh-48px)] w-full max-w-7xl min-w-0 flex-col gap-4">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Calendar DND Sandbox</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">週カレンダー DnD 操作確認</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">初期表示範囲の 00:30 / 02:00 / 03:15 / 06:15 にドラッグ可能な event を置いてあります。別日・別時刻・終日行に動かすと sandbox 内の state だけを更新し、元に戻す toast を表示します。</p>
            </div>
            <button type="button" className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900" onClick={handleReset}>Reset</button>
          </div>
        </section>

        <section className="grid min-h-0 flex-1">
          <div className="min-h-0 overflow-hidden rounded-3xl border border-slate-800 bg-white">
            <CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={events} calendarGridStyle={CALENDAR_GRID_STYLE} selectedDate={visibleDays[0] ?? SAMPLE_START_DATE} onMoveCalendarEvent={handleMoveCalendarEvent} />
          </div>
        </section>
      </div>
    </div>
  );
};

export { CalendarDndSandboxPage };
