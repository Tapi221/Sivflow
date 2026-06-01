import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addBusinessDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { CarvePanel, CarvePanelShell } from "@/components/panel/CarvePanel.desktop";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { CalendarEventMoveHandler, CalendarGridStyle } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarDndViewMode = "week" | "month";

type SampleEventDefinition = { id: string; title: string; startsAt: Date; endsAt: Date; isAllDay?: boolean; accentColor: string };

type CalendarEventUndoSnapshot = {
  event: GoogleCalendarEvent;
};

const SANDBOX_ACCOUNT_ID = "calendar-dnd-sandbox";
const SANDBOX_CALENDAR_ID = "sandbox-calendar";
const SAMPLE_START_DATE = new Date(2026, 5, 1);
const VISIBLE_WORKWEEK_COUNT = 2;
const WEEKDAYS_PER_WORKWEEK = 5;
const CALENDAR_GRID_STYLE: CalendarGridStyle = { "--calendar-hour-row-height": "72px" };
const SANDBOX_HEADER_DESCRIPTION = "週表示は2週分の平日、月表示は同じサンプル予定で DnD を確認します。移動は sandbox 内の state だけに反映し、元に戻す toast を表示します。";
const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const IOS_CALENDAR_MONTH_SURFACE_CLASS = "border-transparent bg-[rgba(255,255,255,0.92)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";
const VIEW_MODE_OPTIONS: readonly { value: CalendarDndViewMode; label: string }[] = [
  { value: "week", label: "週表示" },
  { value: "month", label: "月表示" },
];
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
  { id: "all-day-note", title: "終日イベント移動テスト", startsAt: new Date(2026, 5, 4, 0, 0), endsAt: new Date(2026, 5, 5, 0, 0), isAllDay: true, accentColor: "#14b8a6" },
  { id: "month-only-a", title: "月表示: 日付移動 A", startsAt: new Date(2026, 5, 10, 8, 30), endsAt: new Date(2026, 5, 10, 9, 30), accentColor: "#6366f1" },
  { id: "month-only-b", title: "月表示: 午後移動 B", startsAt: new Date(2026, 5, 18, 15, 0), endsAt: new Date(2026, 5, 18, 16, 0), accentColor: "#f43f5e" },
  { id: "month-all-day", title: "月表示: 終日移動", startsAt: new Date(2026, 5, 24, 0, 0), endsAt: new Date(2026, 5, 26, 0, 0), isAllDay: true, accentColor: "#10b981" },
] as const;

const createSampleEvent = (definition: SampleEventDefinition): GoogleCalendarEvent => ({ accountId: SANDBOX_ACCOUNT_ID, calendarId: SANDBOX_CALENDAR_ID, isAllDay: false, ...definition, startsAt: new Date(definition.startsAt), endsAt: new Date(definition.endsAt) });

const cloneEvent = (event: GoogleCalendarEvent): GoogleCalendarEvent => ({ ...event, startsAt: new Date(event.startsAt), endsAt: new Date(event.endsAt) });

const createSampleEvents = (): GoogleCalendarEvent[] => SAMPLE_EVENT_DEFINITIONS.map(createSampleEvent);

const createVisibleDays = (): Date[] => Array.from({ length: VISIBLE_WORKWEEK_COUNT * WEEKDAYS_PER_WORKWEEK }, (_, index) => addBusinessDays(startOfDay(SAMPLE_START_DATE), index));

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

const getViewModeButtonClassName = (isSelected: boolean): string => cn("h-8 rounded-full px-3 text-[13px] font-semibold transition-colors", isSelected ? "bg-[#1c1c1e] text-white" : "text-[rgba(60,60,67,0.72)] hover:bg-[#f5f5f7] hover:text-[#1c1c1e]");

const CalendarDndSandboxPage = () => {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const eventsRef = useRef<GoogleCalendarEvent[]>([]);
  const visibleDays = useMemo(() => createVisibleDays(), []);
  const [viewMode, setViewMode] = useState<CalendarDndViewMode>("week");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(SAMPLE_START_DATE));
  const [events, setEvents] = useState<GoogleCalendarEvent[]>(() => createSampleEvents().map(cloneEvent));

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const handleMoveCalendarEvent = useCallback<CalendarEventMoveHandler>(({ event, startsAt, endsAt, isAllDay }) => {
    const previousEvent = eventsRef.current.find((currentEvent) => isSameCalendarEvent(currentEvent, event));
    if (!previousEvent) return;

    const snapshot = createCalendarEventUndoSnapshot(previousEvent);

    setEvents((currentEvents) => currentEvents.map((currentEvent) => moveEventTime(currentEvent, event, startsAt, endsAt, isAllDay)));
    toast("予定を移動しました", {
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
    setSelectedDate(new Date(SAMPLE_START_DATE));
    setEvents(createSampleEvents().map(cloneEvent));
    toast.dismiss();
  }, []);

  return (
    <div className="flex h-screen min-h-0 w-full min-w-0 flex-col bg-white text-[#1c1c1e]">
      <CarvePanelShell>
        <CarvePanel>
          <div className="mb-2 flex shrink-0 items-start justify-between gap-4 px-5 pt-4">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-[#1c1c1e]">カレンダー DnD 操作確認</h1>
                <span className="shrink-0 rounded-full border border-[#e5e5ea] bg-[#f5f5f7] px-2.5 py-1 text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]">Sandbox</span>
              </div>
              <p className="mt-1 max-w-3xl text-[12px] leading-5 text-[rgba(60,60,67,0.58)]">{SANDBOX_HEADER_DESCRIPTION}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center rounded-full border border-[#e5e5ea] bg-white p-0.5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
                {VIEW_MODE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" className={getViewModeButtonClassName(viewMode === option.value)} onClick={() => setViewMode(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
              <button type="button" className="h-8 shrink-0 rounded-full border border-[#d1d1d6] bg-white px-3 text-[13px] font-semibold text-[#1c1c1e] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] transition-colors hover:bg-[#f5f5f7]" onClick={handleReset}>Reset</button>
            </div>
          </div>

          {viewMode === "month" ? (
            <div className={cn("ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-r-0", IOS_CALENDAR_MONTH_SURFACE_CLASS)}>
              <CalendarMonthView currentDate={SAMPLE_START_DATE} selectedDate={selectedDate} visibleEvents={events} onSelectDate={setSelectedDate} onMoveCalendarEvent={handleMoveCalendarEvent} />
            </div>
          ) : (
            <div className={cn("ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0", IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}>
              <CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={events} calendarGridStyle={CALENDAR_GRID_STYLE} selectedDate={selectedDate} onSelectDate={setSelectedDate} onMoveCalendarEvent={handleMoveCalendarEvent} />
            </div>
          )}
        </CarvePanel>
      </CarvePanelShell>
    </div>
  );
};

export { CalendarDndSandboxPage };
