import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CarvePanel, CarvePanelShell } from "@web-renderer/chip/panel/panel/CarvePanel.desktop";
import { cn } from "@web-renderer/lib/utils";
import { addBusinessDays, startOfDay } from "date-fns";
import type { PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { CalendarEventMoveHandler, CalendarGridStyle } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type CalendarDndViewMode = "week" | "month";

type CalendarDndPageDirection = "previous" | "next";

type SampleEventDefinition = {
  id: string; title: string; startsAt: Date; endsAt: Date; isAllDay?: boolean; accentColor: string; };

type CalendarEventUndoSnapshot = {
  event: GoogleCalendarEvent;
};

type CalendarDndPointerSnapshot = {
  pointerId: number;
  buttons: number;
  clientX: number;
  clientY: number;
};

const SANDBOX_ACCOUNT_ID = "calendar-dnd-sandbox";
const SANDBOX_CALENDAR_ID = "sandbox-calendar";
const SAMPLE_START_DATE = new Date(2026, 5, 1);
const WEEKDAYS_PER_WORKWEEK = 5;
const CALENDAR_GRID_STYLE: CalendarGridStyle = { "--calendar-hour-row-height": "72px" };
const SANDBOX_HEADER_DESCRIPTION = "週表示と月表示の DnD を同じサンプル予定で確認します。週表示では予定をドラッグしたまま左右端へ寄せると前後の週へ連続ページ送りします。";
const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const IOS_CALENDAR_MONTH_SURFACE_CLASS = "border-transparent bg-[rgba(255,255,255,0.92)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";
const WEEKDAY_DRAG_PAGE_EDGE_WIDTH_PX = 72;
const WEEKDAY_DRAG_PAGE_REPEAT_INTERVAL_MS = 700;
const VIEW_MODE_OPTIONS: readonly { value: CalendarDndViewMode; label: string; }[] = [
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
  { id: "adjacent-trim-a", title: "精読.25", startsAt: new Date(2026, 5, 5, 13, 56), endsAt: new Date(2026, 5, 5, 14, 11), accentColor: "#2563eb" },
  { id: "adjacent-trim-b", title: "きめる現.小復習", startsAt: new Date(2026, 5, 5, 14, 11), endsAt: new Date(2026, 5, 5, 14, 25), accentColor: "#ef4444" },
  { id: "all-day-note", title: "終日イベント移動テスト", startsAt: new Date(2026, 5, 4, 0, 0), endsAt: new Date(2026, 5, 5, 0, 0), isAllDay: true, accentColor: "#14b8a6" },
  { id: "month-only-a", title: "月表示: 日付移動 A", startsAt: new Date(2026, 5, 10, 8, 30), endsAt: new Date(2026, 5, 10, 9, 30), accentColor: "#6366f1" },
  { id: "month-only-b", title: "月表示: 午後移動 B", startsAt: new Date(2026, 5, 18, 15, 0), endsAt: new Date(2026, 5, 18, 16, 0), accentColor: "#f43f5e" },
  { id: "month-all-day", title: "月表示: 終日移動", startsAt: new Date(2026, 5, 24, 0, 0), endsAt: new Date(2026, 5, 26, 0, 0), isAllDay: true, accentColor: "#10b981" },
] as const;

const createSampleEvent = (definition: SampleEventDefinition): GoogleCalendarEvent => ({ accountId: SANDBOX_ACCOUNT_ID, calendarId: SANDBOX_CALENDAR_ID, isAllDay: false, ...definition, startsAt: new Date(definition.startsAt), endsAt: new Date(definition.endsAt) });

const cloneEvent = (event: GoogleCalendarEvent): GoogleCalendarEvent => ({ ...event, startsAt: new Date(event.startsAt), endsAt: new Date(event.endsAt) });

const createSampleEvents = (): GoogleCalendarEvent[] => SAMPLE_EVENT_DEFINITIONS.map(createSampleEvent);

const createVisibleDays = (startDate: Date): Date[] => Array.from({ length: WEEKDAYS_PER_WORKWEEK }, (_, index) => addBusinessDays(startOfDay(startDate), index));

const createCalendarEventUndoSnapshot = (event: GoogleCalendarEvent): CalendarEventUndoSnapshot => ({ event: cloneEvent(event) });

const createPointerSnapshot = (pointerId: number, buttons: number, clientX: number, clientY: number): CalendarDndPointerSnapshot => ({ pointerId, buttons, clientX, clientY });

const isSameCalendarEvent = (left: GoogleCalendarEvent, right: GoogleCalendarEvent): boolean => left.id === right.id && left.calendarId === right.calendarId && left.accountId === right.accountId;

const isCalendarDndEventDragTarget = (target: EventTarget | null): boolean => target instanceof Element && target.closest(".cursor-grab") !== null;

const dispatchDragPreviewPointerMove = (snapshot: CalendarDndPointerSnapshot): void => {
  if (typeof window === "undefined" || typeof window.PointerEvent === "undefined") return;

  window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, pointerId: snapshot.pointerId, buttons: snapshot.buttons, clientX: snapshot.clientX, clientY: snapshot.clientY }));
};

const getDragPageDirection = (element: HTMLElement, clientX: number): CalendarDndPageDirection | null => {
  const rect = element.getBoundingClientRect();

  if (clientX <= rect.left + WEEKDAY_DRAG_PAGE_EDGE_WIDTH_PX) return "previous";
  if (clientX >= rect.right - WEEKDAY_DRAG_PAGE_EDGE_WIDTH_PX) return "next";

  return null;
};

const moveEventTime = (targetEvent: GoogleCalendarEvent, sourceEvent: GoogleCalendarEvent, startsAt: Date, endsAt: Date, isAllDay: boolean): GoogleCalendarEvent => {
  if (!isSameCalendarEvent(targetEvent, sourceEvent)) return targetEvent;

  return { ...targetEvent, startsAt: new Date(startsAt), endsAt: new Date(endsAt), isAllDay };
};

const restoreEventTime = (targetEvent: GoogleCalendarEvent, snapshot: CalendarEventUndoSnapshot): GoogleCalendarEvent => {
  if (!isSameCalendarEvent(targetEvent, snapshot.event)) return targetEvent;

  return cloneEvent(snapshot.event);
};

const getViewModeButtonClassName = (isSelected: boolean): string => cn("h-8 rounded-full px-3 text-xs font-semibold transition-colors", isSelected ? "bg-[#1c1c1e] text-white" : "text-[rgba(60,60,67,0.72)] hover:bg-[#f5f5f7] hover:text-zinc-900");

const getWeekPageButtonClassName = (): string => "h-8 shrink-0 rounded-full border border-[#d1d1d6] bg-white px-3 text-xs font-semibold text-zinc-900 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] transition-colors hover:bg-[#f5f5f7]";

const CalendarDndSandboxPage = () => {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const allDayScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const calendarSurfaceRef = useRef<HTMLDivElement | null>(null);
  const eventsRef = useRef<GoogleCalendarEvent[]>([]);
  const dragPagePointerIdRef = useRef<number | null>(null);
  const dragPageDirectionRef = useRef<CalendarDndPageDirection | null>(null);
  const dragPageIntervalRef = useRef<number | null>(null);
  const dragPointerSnapshotRef = useRef<CalendarDndPointerSnapshot | null>(null);
  const [viewMode, setViewMode] = useState<CalendarDndViewMode>("week");
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => new Date(SAMPLE_START_DATE));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(SAMPLE_START_DATE));
  const [events, setEvents] = useState<GoogleCalendarEvent[]>(() => createSampleEvents().map(cloneEvent));
  const visibleDays = useMemo(() => createVisibleDays(weekStartDate), [weekStartDate]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const handleMoveWeekPage = useCallback((direction: CalendarDndPageDirection) => {
    setWeekStartDate((currentDate) => addBusinessDays(currentDate, direction === "next" ? WEEKDAYS_PER_WORKWEEK : -WEEKDAYS_PER_WORKWEEK));
  }, []);

  const clearDragPageInterval = useCallback(() => {
    if (dragPageIntervalRef.current === null) return;

    window.clearInterval(dragPageIntervalRef.current);
    dragPageIntervalRef.current = null;
  }, []);

  const stopWeekDragPaging = useCallback(() => {
    dragPagePointerIdRef.current = null;
    dragPageDirectionRef.current = null;
    dragPointerSnapshotRef.current = null;
    clearDragPageInterval();
  }, [clearDragPageInterval]);

  const pauseWeekDragPaging = useCallback(() => {
    dragPageDirectionRef.current = null;
    clearDragPageInterval();
  }, [clearDragPageInterval]);

  const startWeekDragPaging = useCallback((direction: CalendarDndPageDirection) => {
    if (dragPageDirectionRef.current === direction && dragPageIntervalRef.current !== null) return;

    clearDragPageInterval();
    dragPageDirectionRef.current = direction;
    handleMoveWeekPage(direction);
    dragPageIntervalRef.current = window.setInterval(() => {
      if (dragPagePointerIdRef.current === null || dragPageDirectionRef.current !== direction) {
        clearDragPageInterval();
        return;
      }

      handleMoveWeekPage(direction);
    }, WEEKDAY_DRAG_PAGE_REPEAT_INTERVAL_MS);
  }, [clearDragPageInterval, handleMoveWeekPage]);

  const updateWeekDragPaging = useCallback((pointerId: number, buttons: number, clientX: number, clientY: number) => {
    const surfaceElement = calendarSurfaceRef.current;
    if (dragPagePointerIdRef.current !== pointerId) return;

    dragPointerSnapshotRef.current = createPointerSnapshot(pointerId, buttons, clientX, clientY);

    if (buttons !== 1 || !surfaceElement) {
      stopWeekDragPaging();
      return;
    }

    const direction = getDragPageDirection(surfaceElement, clientX);
    if (!direction) {
      pauseWeekDragPaging();
      return;
    }

    startWeekDragPaging(direction);
  }, [pauseWeekDragPaging, startWeekDragPaging, stopWeekDragPaging]);

  const handleWeekDragPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !isCalendarDndEventDragTarget(event.target)) return;

    dragPagePointerIdRef.current = event.pointerId;
    dragPointerSnapshotRef.current = createPointerSnapshot(event.pointerId, event.buttons, event.clientX, event.clientY);
  }, []);

  const handleWeekDragPointerMoveCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    updateWeekDragPaging(event.pointerId, event.buttons, event.clientX, event.clientY);
  }, [updateWeekDragPaging]);

  const handleWeekDragPointerEndCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPagePointerIdRef.current !== event.pointerId) return;

    stopWeekDragPaging();
  }, [stopWeekDragPaging]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => updateWeekDragPaging(event.pointerId, event.buttons, event.clientX, event.clientY);
    const handlePointerEnd = (event: PointerEvent) => {
      if (dragPagePointerIdRef.current !== event.pointerId) return;

      stopWeekDragPaging();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      clearDragPageInterval();
    };
  }, [clearDragPageInterval, stopWeekDragPaging, updateWeekDragPaging]);

  useEffect(() => {
    const snapshot = dragPointerSnapshotRef.current;
    if (!snapshot || snapshot.buttons !== 1 || dragPagePointerIdRef.current !== snapshot.pointerId) return undefined;

    const frame = window.requestAnimationFrame(() => dispatchDragPreviewPointerMove(snapshot));
    return () => window.cancelAnimationFrame(frame);
  }, [visibleDays]);

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
    setWeekStartDate(new Date(SAMPLE_START_DATE));
    setSelectedDate(new Date(SAMPLE_START_DATE));
    setEvents(createSampleEvents().map(cloneEvent));
    stopWeekDragPaging();
    toast.dismiss();
  }, [stopWeekDragPaging]);

  return (
    <div className="flex h-screen min-h-0 w-full min-w-0 flex-col bg-white text-zinc-900">
      <CarvePanelShell>
        <CarvePanel>
          <div className="mb-2 flex shrink-0 items-start justify-between gap-4 px-5 pt-4">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <h1 className="truncate text-base font-semibold tracking-tight text-zinc-900">カレンダー DnD 操作確認</h1>
                <span className="shrink-0 rounded-full border border-zinc-200 bg-[#f5f5f7] px-2.5 py-1 text-xs font-semibold leading-none text-[rgba(60,60,67,0.58)]">Sandbox</span>
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[rgba(60,60,67,0.58)]">{SANDBOX_HEADER_DESCRIPTION}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {viewMode === "week" ? (
                <div className="flex items-center gap-1">
                  <button type="button" className={getWeekPageButtonClassName()} onClick={() => handleMoveWeekPage("previous")}>前週</button>
                  <button type="button" className={getWeekPageButtonClassName()} onClick={() => handleMoveWeekPage("next")}>次週</button>
                </div>
              ) : null}
              <div className="flex items-center rounded-full border border-zinc-200 bg-white p-0.5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
                {VIEW_MODE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" className={getViewModeButtonClassName(viewMode === option.value)} onClick={() => setViewMode(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
              <button type="button" className="h-8 shrink-0 rounded-full border border-[#d1d1d6] bg-white px-3 text-xs font-semibold text-zinc-900 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] transition-colors hover:bg-[#f5f5f7]" onClick={handleReset}>Reset</button>
            </div>
          </div>

          {viewMode === "month" ? (
            <div className={cn("ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-r-0", IOS_CALENDAR_MONTH_SURFACE_CLASS)}>
              <CalendarMonthView currentDate={SAMPLE_START_DATE} selectedDate={selectedDate} visibleEvents={events} onSelectDate={setSelectedDate} onMoveCalendarEvent={handleMoveCalendarEvent} />
            </div>
          ) : (
            <div ref={calendarSurfaceRef} className={cn("ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0", IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)} onPointerDownCapture={handleWeekDragPointerDownCapture} onPointerMoveCapture={handleWeekDragPointerMoveCapture} onPointerUpCapture={handleWeekDragPointerEndCapture} onPointerCancelCapture={handleWeekDragPointerEndCapture}>
              <CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={events} calendarGridStyle={CALENDAR_GRID_STYLE} selectedDate={selectedDate} onSelectDate={setSelectedDate} onMoveCalendarEvent={handleMoveCalendarEvent} />
            </div>
          )}
        </CarvePanel>
      </CarvePanelShell>
    </div>
  );
};

export { CalendarDndSandboxPage };
