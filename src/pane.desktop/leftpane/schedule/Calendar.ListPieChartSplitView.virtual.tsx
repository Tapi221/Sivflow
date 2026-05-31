import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { differenceInCalendarDays, differenceInMinutes, format, getDaysInMonth, isSameDay, startOfMonth, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { LIST_DAY_GAP_PX, LIST_DAY_SECTION_MIN_HEIGHT_PX, LIST_EMPTY_DAY_HEIGHT_PX, LIST_EVENT_ROW_GAP_PX, LIST_EVENT_ROW_HEIGHT_PX } from "@/chip/eventchip/EventChip.list.placement";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { buildScheduleVirtualRailDays, getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import type { AppCalendarItem, GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarListPieChartSplitViewProps = {
  days: Date[];
  virtualRail?: ScheduleVirtualRail;
  selectedDate: Date;
  events: GoogleCalendarEvent[];
  appProjects: AppCalendarItem[];
  googleAccounts: GoogleAccountDisplay[];
  onSelectDate?: (date: Date) => void;
  onReachStart?: () => void;
  onReachEnd?: () => void;
  onVisibleMonthChange?: (date: Date) => void;
  onVisibleDateChange?: (date: Date) => void;
  className?: string;
};

type VirtualRange = {
  start: number;
  end: number;
};

type PieSegment = {
  id: string;
  label: string;
  color: string;
  minutes: number;
};

type SplitDay = {
  date: Date;
  key: string;
  events: GoogleCalendarEvent[];
  segments: PieSegment[];
  minutes: number;
  isSelected: boolean;
  isToday: boolean;
};

type SplitDaySectionProps = {
  day: SplitDay;
  onSelectDate?: (date: Date) => void;
};

type SplitDayDateButtonProps = {
  day: SplitDay;
  onSelectDate?: (date: Date) => void;
};

type SplitVirtualDynamicHeightEntry = {
  index: number;
  extraHeight: number;
  accumulatedExtraHeight: number;
};

type SplitVirtualMetrics = {
  dynamicHeightEntries: SplitVirtualDynamicHeightEntry[];
  totalHeight: number;
};

const SPLIT_DAY_MIN_HEIGHT_PX = LIST_DAY_SECTION_MIN_HEIGHT_PX;
const SPLIT_DAY_GAP_PX = LIST_DAY_GAP_PX;
const SPLIT_DAY_BLOCK_BASE_HEIGHT_PX = SPLIT_DAY_MIN_HEIGHT_PX + SPLIT_DAY_GAP_PX;
const LOCAL_DAYS = 3650;
const OVERSCAN = 5000;
const ANCHOR_OFFSET = 160;
const SELECTED_OFFSET = 8;
const USER_SCROLL_AUTO_SCROLL_BLOCK_MS = 350;
const EMPTY_DAY_LABEL = "予定なし";
const DEFAULT_COLOR = "#8e8e93";
const GAP_COLOR = "#f2f2f7";
const DATE_KEY_PART_COUNT = 3;
const DAY_DATE_NUMBER_CLASS_NAME = "flex h-8 w-8 items-center justify-center rounded-full text-[16px] font-bold leading-none tracking-[-0.03em] tabular-nums transition-all duration-150";
const DAY_WEEKDAY_CLASS_NAME = "text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]";

const createRail = (selectedDate: Date): ScheduleVirtualRail => ({ startDate: subDays(startOfMonth(selectedDate), LOCAL_DAYS), anchorIndex: LOCAL_DAYS, totalDayCount: LOCAL_DAYS * 2 + getDaysInMonth(selectedDate) });

const getIndexForDate = (rail: ScheduleVirtualRail, date: Date) => differenceInCalendarDays(date, rail.startDate);

const parseCalendarDateKey = (dateKey: string): Date | null => {
  const parts = dateKey.split("-");
  if (parts.length !== DATE_KEY_PART_COUNT) return null;

  const [year, month, day] = parts.map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
};

const getSplitDayEstimatedListHeightFromEventCount = (eventCount: number): number => {
  if (eventCount === 0) return LIST_EMPTY_DAY_HEIGHT_PX;

  return eventCount * LIST_EVENT_ROW_HEIGHT_PX + Math.max(0, eventCount - 1) * LIST_EVENT_ROW_GAP_PX;
};

const getSplitDayHeightFromEventCount = (eventCount: number): number => Math.max(SPLIT_DAY_MIN_HEIGHT_PX, getSplitDayEstimatedListHeightFromEventCount(eventCount));

const getSplitDayHeight = (day: SplitDay): number => getSplitDayHeightFromEventCount(day.events.length);

const addExtraHeightForDateKey = (extraHeightByIndex: Map<number, number>, rail: ScheduleVirtualRail, totalDayCount: number, dateKey: string, height: number) => {
  const date = parseCalendarDateKey(dateKey);
  if (!date) return;

  const index = getIndexForDate(rail, date);
  if (index < 0 || index >= totalDayCount) return;

  const extraHeight = Math.max(0, height - SPLIT_DAY_MIN_HEIGHT_PX);
  if (extraHeight <= 0) return;

  extraHeightByIndex.set(index, Math.max(extraHeightByIndex.get(index) ?? 0, extraHeight));
};

const buildSplitVirtualMetrics = (rail: ScheduleVirtualRail, totalDayCount: number, events: GoogleCalendarEvent[]): SplitVirtualMetrics => {
  if (totalDayCount <= 0) return { dynamicHeightEntries: [], totalHeight: 0 };

  const eventCountByDateKey = new Map<string, number>();
  const extraHeightByIndex = new Map<number, number>();

  events.forEach((event) => {
    getEventDateKeys(event).forEach((dateKey) => {
      eventCountByDateKey.set(dateKey, (eventCountByDateKey.get(dateKey) ?? 0) + 1);
    });
  });

  eventCountByDateKey.forEach((eventCount, dateKey) => {
    addExtraHeightForDateKey(extraHeightByIndex, rail, totalDayCount, dateKey, getSplitDayHeightFromEventCount(eventCount));
  });

  let accumulatedExtraHeight = 0;
  const dynamicHeightEntries = Array.from(extraHeightByIndex.entries()).sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex).map(([index, extraHeight]) => {
    accumulatedExtraHeight += extraHeight;

    return { index, extraHeight, accumulatedExtraHeight };
  });
  const baseHeight = totalDayCount * SPLIT_DAY_BLOCK_BASE_HEIGHT_PX - SPLIT_DAY_GAP_PX;

  return { dynamicHeightEntries, totalHeight: Math.max(0, baseHeight + accumulatedExtraHeight) };
};

const getAccumulatedExtraHeightBeforeIndex = (metrics: SplitVirtualMetrics, dayIndex: number): number => {
  let low = 0;
  let high = metrics.dynamicHeightEntries.length - 1;
  let accumulatedExtraHeight = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const entry = metrics.dynamicHeightEntries[middle];

    if (entry.index < dayIndex) {
      accumulatedExtraHeight = entry.accumulatedExtraHeight;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return accumulatedExtraHeight;
};

const getDayTop = (metrics: SplitVirtualMetrics, dayIndex: number): number => dayIndex * SPLIT_DAY_BLOCK_BASE_HEIGHT_PX + getAccumulatedExtraHeightBeforeIndex(metrics, dayIndex);

const getDayIndexAtOffset = (metrics: SplitVirtualMetrics, totalDayCount: number, offset: number): number => {
  if (totalDayCount <= 0) return 0;

  let low = 0;
  let high = totalDayCount - 1;
  let result = 0;
  const normalizedOffset = Math.max(0, offset);

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const dayTop = getDayTop(metrics, middle);

    if (dayTop <= normalizedOffset) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return result;
};

const getRange = (metrics: SplitVirtualMetrics, scrollTop: number, viewportHeight: number, totalDayCount: number): VirtualRange => {
  if (totalDayCount <= 0) return { start: 0, end: 0 };

  const start = getDayIndexAtOffset(metrics, totalDayCount, scrollTop - OVERSCAN);
  const end = Math.min(totalDayCount, getDayIndexAtOffset(metrics, totalDayCount, scrollTop + viewportHeight + OVERSCAN) + 2);

  return { start, end: Math.max(start, end) };
};

const sameRange = (left: VirtualRange, right: VirtualRange) => left.start === right.start && left.end === right.end;

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

const buildSegments = (events: GoogleCalendarEvent[], appProjects: AppCalendarItem[], calendarLabels: Map<string, string>) => {
  const segments = new Map<string, PieSegment>();

  events.forEach((event) => {
    if (event.isAllDay) return;

    const minutes = getTimedMinutes(event);
    if (minutes <= 0) return;

    const id = event.projectId ?? event.calendarId ?? event.id;
    const existing = segments.get(id);

    if (existing) {
      existing.minutes += minutes;
      return;
    }

    segments.set(id, { id, label: getSegmentLabel(event, appProjects, calendarLabels), color: generateColorTokens(event.accentColor || DEFAULT_COLOR).bg, minutes });
  });

  return Array.from(segments.values());
};

const buildDays = (dates: Date[], events: GoogleCalendarEvent[], selectedDate: Date, appProjects: AppCalendarItem[], googleAccounts: GoogleAccountDisplay[]): SplitDay[] => {
  const today = new Date();
  const eventsByDay = new Map<string, GoogleCalendarEvent[]>();
  const dayByKey = new Map<string, Date>();
  const calendarLabels = getCalendarLabelMap(googleAccounts);

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
    const segments = buildSegments(dayEvents, appProjects, calendarLabels);
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

const getSplitDayDateNumberClassName = (day: SplitDay): string => cn(DAY_DATE_NUMBER_CLASS_NAME, day.isSelected ? "bg-[#3a77b2] text-white ring-1 ring-[#3a77b2]" : day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]");

const EmptyDayCard = () => <div className="flex h-[34px] items-center rounded-[10px] border border-dashed border-[#dedede] bg-white px-3 text-[12px] font-semibold text-[#8e8e93]">{EMPTY_DAY_LABEL}</div>;

const SplitDayDateButton = ({ day, onSelectDate }: SplitDayDateButtonProps) => (
  <button type="button" className="mt-0.5 flex h-8 items-center justify-end gap-1 rounded-[10px] pr-0.5 text-right transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25" onClick={() => onSelectDate?.(day.date)}>
    <span className={getSplitDayDateNumberClassName(day)}>{format(day.date, "d")}</span>
    <span className={DAY_WEEKDAY_CLASS_NAME}>{format(day.date, "EEE", { locale: ja })}</span>
  </button>
);

const SplitDaySectionComponent = ({ day, onSelectDate }: SplitDaySectionProps) => {
  const hours = Math.round(day.minutes / 60 * 10) / 10;

  return (
    <section className="grid h-full grid-cols-2" aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}>
      <div className="h-full min-h-0 min-w-0 border-r border-[#eeeeee] px-4">
        <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-2">
          <SplitDayDateButton day={day} onSelectDate={onSelectDate} />
          <div className="space-y-1.5 overflow-hidden">
            {day.events.length > 0 ? day.events.map((event) => <CalendarEventChipList key={getEventInstanceKey(day.key, event)} event={event} />) : <EmptyDayCard />}
          </div>
        </div>
      </div>
      <div className="grid h-full min-h-0 min-w-0 grid-cols-[58px_minmax(0,1fr)] gap-2 px-4">
        <SplitDayDateButton day={day} onSelectDate={onSelectDate} />
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_180px] items-start gap-4">
          <div className="min-w-0 space-y-1.5 overflow-hidden">
            {day.segments.slice(0, 6).map((segment) => (
              <div key={segment.id} className="flex items-center gap-2 text-[12px] font-medium text-[#3a3a3c]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                <span className="truncate">{segment.label}</span>
                <span className="ml-auto shrink-0 tabular-nums text-[#8e8e93]">{Math.round(segment.minutes / 60 * 10) / 10}h</span>
              </div>
            ))}
            {day.segments.length === 0 ? <div className="text-[13px] font-semibold text-[#8e8e93]">時間指定なし</div> : null}
          </div>
          <div className="mx-auto flex aspect-square w-full max-w-[180px] items-center justify-center rounded-full border border-[#eeeeee]" style={{ background: buildConicGradient(day.segments) }}>
            <div className="flex h-[44%] w-[44%] items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#3a3a3c] shadow-sm">{hours}h</div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SplitDaySection = memo(SplitDaySectionComponent);

SplitDaySection.displayName = "SplitDaySection";

const CalendarListPieChartSplitViewComponent = ({ virtualRail, selectedDate, events, appProjects, googleAccounts, onSelectDate, onVisibleMonthChange, onVisibleDateChange, className }: CalendarListPieChartSplitViewProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSelectedKeyRef = useRef<string | null>(null);
  const lastVisibleKeyRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<HTMLDivElement | null>(null);
  const userScrollBlockUntilRef = useRef(0);
  const rail = useMemo(() => virtualRail ?? createRail(selectedDate), [selectedDate, virtualRail]);
  const metrics = useMemo(() => buildSplitVirtualMetrics(rail, rail.totalDayCount, events), [events, rail]);
  const [range, setRange] = useState<VirtualRange>({ start: 0, end: 1 });
  const dates = useMemo(() => buildScheduleVirtualRailDays(rail, range.start, range.end), [rail, range.end, range.start]);
  const days = useMemo(() => buildDays(dates, events, selectedDate, appProjects, googleAccounts), [appProjects, dates, events, googleAccounts, selectedDate]);
  const totalHeight = metrics.totalHeight;

  const updateRange = useCallback((element: HTMLDivElement | null) => {
    const next = element ? getRange(metrics, element.scrollTop, element.clientHeight, rail.totalDayCount) : getRange(metrics, 0, 0, rail.totalDayCount);
    setRange((current) => sameRange(current, next) ? current : next);
  }, [metrics, rail.totalDayCount]);

  const updateVisibleDate = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const index = getDayIndexAtOffset(metrics, rail.totalDayCount, element.scrollTop + Math.min(ANCHOR_OFFSET, element.clientHeight / 2));
    const date = getScheduleVirtualRailDate(rail, index);
    if (!date) return;
    const key = getCalendarDateKey(date);
    if (lastVisibleKeyRef.current === key) return;
    lastVisibleKeyRef.current = key;
    onVisibleMonthChange?.(date);
    onVisibleDateChange?.(date);
  }, [metrics, onVisibleDateChange, onVisibleMonthChange, rail]);

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
    userScrollBlockUntilRef.current = Date.now() + USER_SCROLL_AUTO_SCROLL_BLOCK_MS;
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
    if (Date.now() < userScrollBlockUntilRef.current) return;
    element.scrollTop = Math.max(0, getDayTop(metrics, index) - SELECTED_OFFSET);
    updateRange(element);
  }, [metrics, rail, selectedDate, updateRange]);

  useEffect(() => () => { if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current); }, []);

  return (
    <div className={cn("ml-4 mr-4 flex min-h-0 flex-1 overflow-hidden bg-white", className)}>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-6 pt-2 scrollbar-hidden" onScroll={handleScroll}>
        <div className="relative min-w-0" style={{ height: totalHeight }}>
          {days.map((day, offset) => {
            const dayIndex = range.start + offset;
            const height = getSplitDayHeight(day);

            return (
              <div key={day.key} className="absolute left-0 right-0" style={{ contain: "layout style", top: getDayTop(metrics, dayIndex), height }}>
                <SplitDaySection day={day} onSelectDate={onSelectDate} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CalendarListPieChartSplitView = memo(CalendarListPieChartSplitViewComponent);

CalendarListPieChartSplitView.displayName = "CalendarListPieChartSplitView";

export { CalendarListPieChartSplitView };
