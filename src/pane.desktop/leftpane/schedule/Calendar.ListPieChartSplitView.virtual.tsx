import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { differenceInCalendarDays, differenceInMinutes, format, getDaysInMonth, isSameDay, startOfMonth, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { buildScheduleVirtualRailDays, getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import type { AppCalendarItem, GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarListPieChartSplitViewProps = { days: Date[]; virtualRail?: ScheduleVirtualRail; selectedDate: Date; events: GoogleCalendarEvent[]; appProjects: AppCalendarItem[]; googleAccounts: GoogleAccountDisplay[]; onSelectDate?: (date: Date) => void; onReachStart?: () => void; onReachEnd?: () => void; onVisibleMonthChange?: (date: Date) => void; onVisibleDateChange?: (date: Date) => void; className?: string };

type VirtualRange = { start: number; end: number };

type PieSegment = { id: string; label: string; color: string; minutes: number };

type SplitDay = { date: Date; key: string; events: GoogleCalendarEvent[]; segments: PieSegment[]; minutes: number; isSelected: boolean; isToday: boolean };

type SplitDaySectionProps = { day: SplitDay; onSelectDate?: (date: Date) => void };

const DAY_HEIGHT = 430;
const DAY_GAP = 8;
const DAY_BLOCK = DAY_HEIGHT + DAY_GAP;
const LOCAL_DAYS = 3650;
const OVERSCAN = 5000;
const ANCHOR_OFFSET = 160;
const SELECTED_OFFSET = 8;
const EMPTY_DAY_LABEL = "予定なし";
const DEFAULT_COLOR = "#8e8e93";
const GAP_COLOR = "#f2f2f7";

const createRail = (selectedDate: Date): ScheduleVirtualRail => ({ startDate: subDays(startOfMonth(selectedDate), LOCAL_DAYS), anchorIndex: LOCAL_DAYS, totalDayCount: LOCAL_DAYS * 2 + getDaysInMonth(selectedDate) });

const getRange = (scrollTop: number, viewportHeight: number, totalDayCount: number): VirtualRange => {
  if (totalDayCount <= 0) return { start: 0, end: 0 };
  const start = Math.max(0, Math.floor(Math.max(0, scrollTop - OVERSCAN) / DAY_BLOCK));
  const end = Math.min(totalDayCount, Math.ceil((scrollTop + viewportHeight + OVERSCAN) / DAY_BLOCK) + 1);
  return { start, end: Math.max(start, end) };
};

const sameRange = (left: VirtualRange, right: VirtualRange) => left.start === right.start && left.end === right.end;

const getIndexForDate = (rail: ScheduleVirtualRail, date: Date) => differenceInCalendarDays(date, rail.startDate);

const getEventInstanceKey = (dateKey: string, event: GoogleCalendarEvent): string => `${dateKey}:${event.id}:${new Date(event.startsAt).getTime()}:${new Date(event.endsAt).getTime()}`;

const getCalendarLabelMap = (googleAccounts: GoogleAccountDisplay[]) => {
  const labels = new Map<string, string>();
  googleAccounts.forEach((account) => account.calendars.forEach((calendar) => labels.set(calendar.id, calendar.summaryOverride ?? calendar.summary)));
  return labels;
};

const getSegmentLabel = (event: GoogleCalendarEvent, appProjects: AppCalendarItem[], calendarLabels: Map<string, string>) => {
  const project = appProjects.find((item) => item.id === event.projectId || item.label === event.projectId);
  return project?.label ?? event.projectId ?? calendarLabels.get(event.calendarId) ?? event.title;
};

const getTimedMinutes = (event: GoogleCalendarEvent) => {
  if (event.isAllDay) return 0;
  return Math.max(0, differenceInMinutes(new Date(event.endsAt), new Date(event.startsAt)));
};

const buildSegments = (date: Date, events: GoogleCalendarEvent[], appProjects: AppCalendarItem[], googleAccounts: GoogleAccountDisplay[]) => {
  const labels = getCalendarLabelMap(googleAccounts);
  const segments = new Map<string, PieSegment>();

  events.forEach((event) => {
    const clipped = clipEventToDay(event, date);
    if (!clipped || clipped.isAllDay) return;

    const minutes = getTimedMinutes(clipped);
    if (minutes <= 0) return;

    const id = event.projectId ?? event.calendarId ?? event.id;
    const existing = segments.get(id);

    if (existing) {
      existing.minutes += minutes;
      return;
    }

    segments.set(id, { id, label: getSegmentLabel(event, appProjects, labels), color: generateColorTokens(event.accentColor || DEFAULT_COLOR).bg, minutes });
  });

  return Array.from(segments.values());
};

const buildDays = (dates: Date[], events: GoogleCalendarEvent[], selectedDate: Date, appProjects: AppCalendarItem[], googleAccounts: GoogleAccountDisplay[]): SplitDay[] => {
  const today = new Date();
  const eventsByDay = new Map<string, GoogleCalendarEvent[]>();
  const dayByKey = new Map<string, Date>();

  dates.forEach((date) => {
    const key = getCalendarDateKey(date);
    eventsByDay.set(key, []);
    dayByKey.set(key, date);
  });

  events.forEach((event) => getEventDateKeys(event).forEach((key) => {
    const date = dayByKey.get(key);
    const dayEvents = eventsByDay.get(key);
    if (!date || !dayEvents) return;
    if (event.isAllDay) {
      dayEvents.push(event);
      return;
    }
    const clipped = clipEventToDay(event, date);
    if (clipped) dayEvents.push(clipped);
  }));

  return dates.map((date) => {
    const key = getCalendarDateKey(date);
    const dayEvents = eventsByDay.get(key) ?? [];
    const segments = buildSegments(date, events, appProjects, googleAccounts);
    dayEvents.sort(compareCalendarEvents);
    return { date, key, events: dayEvents, segments, minutes: segments.reduce((sum, segment) => sum + segment.minutes, 0), isSelected: isSameDay(date, selectedDate), isToday: isSameDay(date, today) };
  });
};

const buildConicGradient = (segments: PieSegment[]) => {
  const usedMinutes = segments.reduce((sum, segment) => sum + segment.minutes, 0);
  const total = Math.max(1440, usedMinutes);
  let cursor = 0;
  const stops = segments.map((segment) => {
    const start = (cursor / total) * 360;
    cursor += segment.minutes;
    const end = (cursor / total) * 360;
    return `${segment.color} ${start}deg ${end}deg`;
  });
  if (cursor < total) stops.push(`${GAP_COLOR} ${(cursor / total) * 360}deg 360deg`);
  return `conic-gradient(${stops.join(", ")})`;
};

const EmptyDayCard = () => <div className="flex h-[34px] items-center rounded-[10px] border border-dashed border-[#dedede] bg-white px-3 text-[12px] font-semibold text-[#8e8e93]">{EMPTY_DAY_LABEL}</div>;

const SplitDaySection = memo(({ day, onSelectDate }: SplitDaySectionProps) => {
  const hours = Math.round(day.minutes / 60 * 10) / 10;
  return <section className="grid h-full grid-cols-2" aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}><div className="min-h-0 min-w-0 border-r border-[#eeeeee] px-4"><div className="grid grid-cols-[58px_minmax(0,1fr)] gap-2"><button type="button" className={cn("mt-0.5 flex h-8 items-baseline justify-end gap-1 rounded-[10px] pr-0.5", day.isSelected && "text-[#1c1c1e]")} onClick={() => onSelectDate?.(day.date)}><span className={cn("text-[16px] font-bold leading-none", day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]")}>{format(day.date, "d")}</span><span className="text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]">{format(day.date, "EEE", { locale: ja })}</span></button><div className="space-y-1.5 overflow-hidden">{day.events.length > 0 ? day.events.map((event) => <CalendarEventChipList key={getEventInstanceKey(day.key, event)} event={event} />) : <EmptyDayCard />}</div></div></div><div className="grid min-h-0 min-w-0 grid-cols-[58px_minmax(0,1fr)] gap-2 px-4"><button type="button" className={cn("mt-0.5 flex h-8 items-baseline justify-end gap-1 rounded-[10px] pr-0.5", day.isSelected && "text-[#1c1c1e]")} onClick={() => onSelectDate?.(day.date)}><span className={cn("text-[16px] font-bold leading-none", day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]")}>{format(day.date, "d")}</span><span className="text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]">{format(day.date, "EEE", { locale: ja })}</span></button><div className="grid min-h-0 grid-cols-[minmax(0,1fr)_180px] items-center gap-4"><div className="min-w-0 space-y-1.5 overflow-hidden">{day.segments.slice(0, 6).map((segment) => <div key={segment.id} className="flex items-center gap-2 text-[12px] font-medium text-[#3a3a3c]"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} /><span className="truncate">{segment.label}</span><span className="ml-auto shrink-0 tabular-nums text-[#8e8e93]">{Math.round(segment.minutes / 60 * 10) / 10}h</span></div>)}{day.segments.length === 0 ? <div className="text-[13px] font-semibold text-[#8e8e93]">時間指定なし</div> : null}</div><div className="mx-auto flex aspect-square w-full max-w-[180px] items-center justify-center rounded-full border border-[#eeeeee]" style={{ background: buildConicGradient(day.segments) }}><div className="flex h-[44%] w-[44%] items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#3a3a3c] shadow-sm">{hours}h</div></div></div></div></section>;
});

SplitDaySection.displayName = "SplitDaySection";

const CalendarListPieChartSplitViewComponent = ({ virtualRail, selectedDate, events, appProjects, googleAccounts, onSelectDate, onVisibleMonthChange, onVisibleDateChange, className }: CalendarListPieChartSplitViewProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSelectedKeyRef = useRef<string | null>(null);
  const lastVisibleKeyRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<HTMLDivElement | null>(null);
  const rail = useMemo(() => virtualRail ?? createRail(selectedDate), [selectedDate, virtualRail]);
  const [range, setRange] = useState<VirtualRange>({ start: 0, end: 1 });
  const dates = useMemo(() => buildScheduleVirtualRailDays(rail, range.start, range.end), [rail, range.end, range.start]);
  const days = useMemo(() => buildDays(dates, events, selectedDate, appProjects, googleAccounts), [appProjects, dates, events, googleAccounts, selectedDate]);
  const totalHeight = Math.max(0, rail.totalDayCount * DAY_BLOCK - DAY_GAP);

  const updateRange = useCallback((element: HTMLDivElement | null) => {
    const next = element ? getRange(element.scrollTop, element.clientHeight, rail.totalDayCount) : getRange(0, 0, rail.totalDayCount);
    setRange((current) => sameRange(current, next) ? current : next);
  }, [rail.totalDayCount]);

  const updateVisibleDate = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const index = Math.max(0, Math.min(rail.totalDayCount - 1, Math.floor((element.scrollTop + Math.min(ANCHOR_OFFSET, element.clientHeight / 2)) / DAY_BLOCK)));
    const date = getScheduleVirtualRailDate(rail, index);
    if (!date) return;
    const key = getCalendarDateKey(date);
    if (lastVisibleKeyRef.current === key) return;
    lastVisibleKeyRef.current = key;
    onVisibleMonthChange?.(date);
    onVisibleDateChange?.(date);
  }, [onVisibleDateChange, onVisibleMonthChange, rail]);

  const scheduleDeferred = useCallback((element: HTMLDivElement) => {
    pendingRef.current = element;
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const pending = pendingRef.current;
      pendingRef.current = null;
      updateVisibleDate(pending);
    });
  }, [updateVisibleDate]);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    updateRange(event.currentTarget);
    scheduleDeferred(event.currentTarget);
  }, [scheduleDeferred, updateRange]);

  useLayoutEffect(() => { updateRange(scrollRef.current); }, [updateRange]);

  useEffect(() => {
    const element = scrollRef.current;
    const key = getCalendarDateKey(selectedDate);
    const index = getIndexForDate(rail, selectedDate);
    if (lastSelectedKeyRef.current === key || !element || index < 0 || index >= rail.totalDayCount) return;
    lastSelectedKeyRef.current = key;
    element.scrollTop = Math.max(0, index * DAY_BLOCK - SELECTED_OFFSET);
    updateRange(element);
  }, [rail, selectedDate, updateRange]);

  useEffect(() => () => { if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current); }, []);

  return <div className={cn("ml-4 mr-4 flex min-h-0 flex-1 overflow-hidden bg-white", className)}><div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-6 pt-2 scrollbar-hidden" onScroll={handleScroll}><div className="relative min-w-0" style={{ height: totalHeight }}>{days.map((day, offset) => <div key={day.key} className="absolute left-0 right-0" style={{ contain: "layout style", top: (range.start + offset) * DAY_BLOCK, height: DAY_HEIGHT }}><SplitDaySection day={day} onSelectDate={onSelectDate} /></div>)}</div></div></div>;
};

const CalendarListPieChartSplitView = memo(CalendarListPieChartSplitViewComponent);

CalendarListPieChartSplitView.displayName = "CalendarListPieChartSplitView";

export { CalendarListPieChartSplitView };