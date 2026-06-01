import { useCallback, useMemo, useRef, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { CalendarGridStyle, CalendarTimedEventMoveHandler } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

const SANDBOX_ACCOUNT_ID = "calendar-dnd-sandbox";
const SANDBOX_CALENDAR_ID = "sandbox-calendar";
const SAMPLE_START_DATE = new Date(2026, 5, 1);
const CALENDAR_GRID_STYLE: CalendarGridStyle = { "--calendar-hour-row-height": "72px" };
const SAMPLE_EVENTS: readonly GoogleCalendarEvent[] = [
  {
    id: "midnight-review",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "深夜レビュー",
    startsAt: new Date(2026, 5, 1, 0, 30),
    endsAt: new Date(2026, 5, 1, 1, 30),
    isAllDay: false,
    accentColor: "#0ea5e9",
  },
  {
    id: "early-vocab",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "早朝英単語",
    startsAt: new Date(2026, 5, 2, 2, 0),
    endsAt: new Date(2026, 5, 2, 3, 0),
    isAllDay: false,
    accentColor: "#22c55e",
  },
  {
    id: "visible-overlap-a",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "重なり確認 A",
    startsAt: new Date(2026, 5, 3, 3, 15),
    endsAt: new Date(2026, 5, 3, 4, 30),
    isAllDay: false,
    accentColor: "#a78bfa",
  },
  {
    id: "visible-overlap-b",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "重なり確認 B",
    startsAt: new Date(2026, 5, 3, 3, 45),
    endsAt: new Date(2026, 5, 3, 4, 15),
    isAllDay: false,
    accentColor: "#ec4899",
  },
  {
    id: "morning-visible",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "朝の移動テスト",
    startsAt: new Date(2026, 5, 4, 6, 15),
    endsAt: new Date(2026, 5, 4, 7, 15),
    isAllDay: false,
    accentColor: "#f97316",
  },
  {
    id: "morning-review",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "朝の復習セッション",
    startsAt: new Date(2026, 5, 1, 9, 0),
    endsAt: new Date(2026, 5, 1, 10, 15),
    isAllDay: false,
    accentColor: "#38bdf8",
  },
  {
    id: "overlap-short",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "英単語 20 枚",
    startsAt: new Date(2026, 5, 1, 9, 20),
    endsAt: new Date(2026, 5, 1, 9, 55),
    isAllDay: false,
    accentColor: "#22c55e",
  },
  {
    id: "deck-maintenance",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "デッキ整理",
    startsAt: new Date(2026, 5, 2, 10, 0),
    endsAt: new Date(2026, 5, 2, 11, 30),
    isAllDay: false,
    accentColor: "#a78bfa",
  },
  {
    id: "reading-block",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "PDF 読解",
    startsAt: new Date(2026, 5, 3, 13, 0),
    endsAt: new Date(2026, 5, 3, 14, 30),
    isAllDay: false,
    accentColor: "#f97316",
  },
  {
    id: "dense-a",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "復習予定 A",
    startsAt: new Date(2026, 5, 3, 13, 15),
    endsAt: new Date(2026, 5, 3, 15, 0),
    isAllDay: false,
    accentColor: "#ec4899",
  },
  {
    id: "dense-b",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "復習予定 B",
    startsAt: new Date(2026, 5, 3, 13, 45),
    endsAt: new Date(2026, 5, 3, 14, 15),
    isAllDay: false,
    accentColor: "#eab308",
  },
  {
    id: "all-day-note",
    accountId: SANDBOX_ACCOUNT_ID,
    calendarId: SANDBOX_CALENDAR_ID,
    title: "終日イベントはドラッグ対象外",
    startsAt: new Date(2026, 5, 4, 0, 0),
    endsAt: new Date(2026, 5, 5, 0, 0),
    isAllDay: true,
    accentColor: "#14b8a6",
  },
] as const;

const cloneEvent = (event: GoogleCalendarEvent): GoogleCalendarEvent => ({
  ...event,
  startsAt: new Date(event.startsAt),
  endsAt: new Date(event.endsAt),
});

const createSampleEvents = (): GoogleCalendarEvent[] => SAMPLE_EVENTS.map(cloneEvent);

const createVisibleDays = (): Date[] => Array.from({ length: 5 }, (_, index) => addDays(startOfDay(SAMPLE_START_DATE), index));

const formatDateTime = (date: Date): string => format(date, "M/d HH:mm");

const moveEventTime = (targetEvent: GoogleCalendarEvent, sourceEvent: GoogleCalendarEvent, startsAt: Date, endsAt: Date): GoogleCalendarEvent => {
  if (targetEvent.id !== sourceEvent.id) return targetEvent;

  return {
    ...targetEvent,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    isAllDay: false,
  };
};

const CalendarDndSandboxPage = () => {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const visibleDays = useMemo(createVisibleDays, []);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>(createSampleEvents);

  const handleMoveTimedEvent = useCallback<CalendarTimedEventMoveHandler>((event, startsAt, endsAt) => {
    setEvents((currentEvents) => currentEvents.map((currentEvent) => moveEventTime(currentEvent, event, startsAt, endsAt)));
  }, []);

  const handleReset = useCallback(() => {
    setEvents(createSampleEvents());
  }, []);

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex h-[calc(100vh-48px)] w-full max-w-7xl min-w-0 flex-col gap-4">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Calendar DND Sandbox</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">週カレンダー DnD 操作確認</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">初期表示範囲の 00:30 / 02:00 / 03:15 / 06:15 にドラッグ可能な event を置いてあります。別日・別時刻に動かすと、15分単位で snap して sandbox 内の state だけを更新します。</p>
            </div>
            <button type="button" className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900" onClick={handleReset}>Reset</button>
          </div>
        </section>

        <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-auto rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Current events</h2>
            <div className="mt-4 space-y-3">
              {events.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: event.accentColor }} />
                    <p className="min-w-0 truncate text-sm font-semibold text-white">{event.title}</p>
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-slate-400">{event.isAllDay ? "終日" : `${formatDateTime(event.startsAt)} - ${formatDateTime(event.endsAt)}`}</p>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-h-0 overflow-hidden rounded-3xl border border-slate-800 bg-white">
            <CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={events} calendarGridStyle={CALENDAR_GRID_STYLE} selectedDate={visibleDays[0] ?? SAMPLE_START_DATE} onMoveTimedEvent={handleMoveTimedEvent} />
          </div>
        </section>
      </div>
    </div>
  );
};

export { CalendarDndSandboxPage };
