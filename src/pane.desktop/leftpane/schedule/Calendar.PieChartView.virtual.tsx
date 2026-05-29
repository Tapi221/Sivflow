import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { differenceInCalendarDays, differenceInMinutes, format, getDaysInMonth, isSameDay, startOfMonth, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { clipEventToDay, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { buildScheduleVirtualRailDays, getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import type { AppCalendarItem, GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarPieChartViewProps = { days: Date[]; virtualRail?: ScheduleVirtualRail; selectedDate: Date; events: GoogleCalendarEvent[]; appProjects: AppCalendarItem[]; googleAccounts: GoogleAccountDisplay[]; onSelectDate?: (date: Date) => void; onVisibleDateChange?: (date: Date) => void; dayHeights?: Record<string, number>; scrollViewportRef?: MutableRefObject<HTMLDivElement | null>; onScrollTopChange?: (scrollTop: number) => void; className?: string };

type VirtualRange = { start: number; end: number };

type DaySummary = { date: Date; key: string; minutes: number; count: number; isSelected: boolean; isToday: boolean };

type DayDateButtonProps = { day: DaySummary; onSelectDate?: (date: Date) => void };

const DAY_HEIGHT = 430;
const DAY_GAP = 8;
const DAY_BLOCK = DAY_HEIGHT + DAY_GAP;
const LOCAL_DAYS = 3650;
const MATERIALIZE_OVERSCAN = 20_000;
const RANGE_UPDATE_GUARD = 8_000;
const ANCHOR_OFFSET = 160;
const SELECTED_OFFSET = 8;
const DAY_DATE_NUMBER_CLASS_NAME = "flex h-8 w-8 items-center justify-center rounded-full text-[16px] font-bold leading-none tracking-[-0.03em] tabular-nums transition-all duration-150";
const DAY_WEEKDAY_CLASS_NAME = "text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]";
const SELECTED_DAY_DATE_NUMBER_CLASS_NAME = "border-0 bg-[var(--ds-color-tag-sky-bg)] text-[var(--ds-color-tag-sky-fg)] shadow-none ring-0";

const createRail = (selectedDate: Date): ScheduleVirtualRail => ({ startDate: subDays(startOfMonth(selectedDate), LOCAL_DAYS), anchorIndex: LOCAL_DAYS, totalDayCount: LOCAL_DAYS * 2 + getDaysInMonth(selectedDate) });

const getKey = (date: Date) => getCalendarDateKey(date);

const getRange = (scrollTop: number, viewportHeight: number, totalDayCount: number): VirtualRange => {
  if (totalDayCount <= 0) return { start: 0, end: 0 };
  const start = Math.max(0, Math.floor(Math.max(0, scrollTop - MATERIALIZE_OVERSCAN) / DAY_BLOCK));
  const end = Math.min(totalDayCount, Math.ceil((scrollTop + viewportHeight + MATERIALIZE_OVERSCAN) / DAY_BLOCK) + 1);
  return { start, end: Math.max(start, end) };
};

const sameRange = (a: VirtualRange, b: VirtualRange) => a.start === b.start && a.end === b.end;

const shouldRefreshRange = (element: HTMLDivElement, range: VirtualRange): boolean => {
  if (range.end <= range.start) return true;
  const visibleTop = element.scrollTop;
  const visibleBottom = element.scrollTop + element.clientHeight;
  return visibleTop < range.start * DAY_BLOCK + RANGE_UPDATE_GUARD || visibleBottom > range.end * DAY_BLOCK - RANGE_UPDATE_GUARD;
};

const getIndexForDate = (rail: ScheduleVirtualRail, date: Date) => differenceInCalendarDays(date, rail.startDate);

const getEventMinutes = (event: GoogleCalendarEvent) => {
  if (event.isAllDay) return 0;
  return Math.max(0, differenceInMinutes(new Date(event.endsAt), new Date(event.startsAt)));
};

const createDayEventIndex = (dates: Date[], events: GoogleCalendarEvent[]): Map<string, GoogleCalendarEvent[]> => {
  const eventsByDay = new Map<string, GoogleCalendarEvent[]>();
  const dateByKey = new Map<string, Date>();

  dates.forEach((date) => {
    const key = getKey(date);
    eventsByDay.set(key, []);
    dateByKey.set(key, date);
  });

  events.forEach((event) => getEventDateKeys(event).forEach((key) => {
    const date = dateByKey.get(key);
    const dayEvents = eventsByDay.get(key);
    if (!date || !dayEvents) return;

    const clipped = clipEventToDay(event, date);
    if (clipped && !clipped.isAllDay && getEventMinutes(clipped) > 0) {
      dayEvents.push(clipped);
    }
  }));

  return eventsByDay;
};

const buildSummaries = (dates: Date[], events: GoogleCalendarEvent[], selectedDate: Date): DaySummary[] => {
  const today = new Date();
  const eventsByDay = createDayEventIndex(dates, events);

  return dates.map((date) => {
    const key = getKey(date);
    const dayEvents = eventsByDay.get(key) ?? [];
    const minutes = dayEvents.reduce((sum, event) => sum + getEventMinutes(event), 0);

    return { date, key, minutes, count: dayEvents.length, isSelected: isSameDay(date, selectedDate), isToday: isSameDay(date, today) };
  });
};

const getDayDateNumberClassName = (day: DaySummary): string => cn(DAY_DATE_NUMBER_CLASS_NAME, day.isSelected ? SELECTED_DAY_DATE_NUMBER_CLASS_NAME : day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]");

const DayDateButton = ({ day, onSelectDate }: DayDateButtonProps) => (
  <button type="button" className="mt-0.5 flex h-8 items-center justify-end gap-1 rounded-[10px] pr-0.5 text-right transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25" onClick={() => onSelectDate?.(day.date)}>
    <span className={getDayDateNumberClassName(day)}>{format(day.date, "d")}</span>
    <span className={DAY_WEEKDAY_CLASS_NAME}>{format(day.date, "EEE", { locale: ja })}</span>
  </button>
);

const DayRow = memo(({ day, onSelectDate }: { day: DaySummary; onSelectDate?: (date: Date) => void }) => {
  const used = Math.min(1, day.minutes / 1440);
  const unused = 1 - used;
  const background = `conic-gradient(#0a84ff 0turn ${used}turn, #f2f2f7 ${used}turn ${used + unused}turn)`;
  return <section className="grid h-full grid-cols-[58px_minmax(0,1fr)] gap-2" aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}><DayDateButton day={day} onSelectDate={onSelectDate} /><div className="grid min-h-0 grid-cols-[minmax(0,1fr)_180px] items-center gap-4"><div className="min-w-0"><div className="text-[13px] font-semibold text-[#3a3a3c]">{day.count > 0 ? `${day.count}件 / ${Math.round(day.minutes / 60 * 10) / 10}h` : "時間指定なし"}</div><div className="mt-2 h-2 rounded-full bg-[#f2f2f7]"><div className="h-full rounded-full bg-[#0a84ff]" style={{ width: `${used * 100}%` }} /></div></div><div className="mx-auto flex aspect-square w-full max-w-[180px] items-center justify-center rounded-full border border-[#eeeeee]" style={{ background }}><div className="flex h-[44%] w-[44%] items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#3a3a3c] shadow-sm">{Math.round(day.minutes / 60 * 10) / 10}h</div></div></div></section>;
});

DayRow.displayName = "DayRow";

const CalendarPieChartViewComponent = ({ virtualRail, selectedDate, events, onSelectDate, onVisibleDateChange, scrollViewportRef: externalRef, onScrollTopChange, className }: CalendarPieChartViewProps) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = externalRef ?? localRef;
  const lastSelectedKeyRef = useRef<string | null>(null);
  const lastVisibleKeyRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<HTMLDivElement | null>(null);
  const rail = useMemo(() => virtualRail ?? createRail(selectedDate), [selectedDate, virtualRail]);
  const [range, setRange] = useState<VirtualRange>({ start: 0, end: 1 });
  const rangeRef = useRef(range);
  const dates = useMemo(() => buildScheduleVirtualRailDays(rail, range.start, range.end), [rail, range.end, range.start]);
  const days = useMemo(() => buildSummaries(dates, events, selectedDate), [dates, events, selectedDate]);
  const totalHeight = Math.max(0, rail.totalDayCount * DAY_BLOCK - DAY_GAP);

  const setRangeIfChanged = useCallback((next: VirtualRange) => { if (sameRange(rangeRef.current, next)) return; rangeRef.current = next; setRange(next); }, []);
  const updateRange = useCallback((element: HTMLDivElement | null, force = false) => { if (!element) return; if (!force && !shouldRefreshRange(element, rangeRef.current)) return; setRangeIfChanged(getRange(element.scrollTop, element.clientHeight, rail.totalDayCount)); }, [rail.totalDayCount, setRangeIfChanged]);
  const updateVisibleDate = useCallback((element: HTMLDivElement | null) => { if (!element || !onVisibleDateChange) return; const index = Math.max(0, Math.min(rail.totalDayCount - 1, Math.floor((element.scrollTop + Math.min(ANCHOR_OFFSET, element.clientHeight / 2)) / DAY_BLOCK))); const date = getScheduleVirtualRailDate(rail, index); if (!date) return; const key = getKey(date); if (lastVisibleKeyRef.current === key) return; lastVisibleKeyRef.current = key; onVisibleDateChange(date); }, [onVisibleDateChange, rail]);
  const scheduleScrollWork = useCallback((element: HTMLDivElement) => { pendingRef.current = element; if (frameRef.current !== null) return; frameRef.current = window.requestAnimationFrame(() => { frameRef.current = null; const pending = pendingRef.current; pendingRef.current = null; if (!pending) return; updateRange(pending); updateVisibleDate(pending); onScrollTopChange?.(pending.scrollTop); }); }, [onScrollTopChange, updateRange, updateVisibleDate]);

  useLayoutEffect(() => { updateRange(scrollRef.current, true); }, [scrollRef, updateRange]);
  useEffect(() => { const element = scrollRef.current; if (!element) return; const handleScroll = () => scheduleScrollWork(element); element.addEventListener("scroll", handleScroll, { passive: true }); return () => element.removeEventListener("scroll", handleScroll); }, [scheduleScrollWork, scrollRef]);
  useEffect(() => { const element = scrollRef.current; const key = getKey(selectedDate); const index = getIndexForDate(rail, selectedDate); if (lastSelectedKeyRef.current === key || !element || index < 0 || index >= rail.totalDayCount) return; lastSelectedKeyRef.current = key; element.scrollTop = Math.max(0, index * DAY_BLOCK - SELECTED_OFFSET); updateRange(element, true); }, [rail, scrollRef, selectedDate, updateRange]);
  useEffect(() => () => { if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current); }, []);

  return <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-white", className)}><div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 scrollbar-hidden"><div className="mx-auto w-full max-w-[940px]"><div className="relative w-full" style={{ height: totalHeight }}>{days.map((day, offset) => <div key={day.key} className="absolute left-0 right-0" style={{ contain: "layout style", top: (range.start + offset) * DAY_BLOCK, height: DAY_HEIGHT }}><DayRow day={day} onSelectDate={onSelectDate} /></div>)}</div></div></div></div>;
};

const CalendarPieChartView = memo(CalendarPieChartViewComponent);

CalendarPieChartView.displayName = "CalendarPieChartView";

export { CalendarPieChartView };