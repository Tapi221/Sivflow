import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import { differenceInCalendarDays, format, getDaysInMonth, isSameDay, startOfMonth, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { LIST_DAY_GAP_PX, LIST_EMPTY_DAY_HEIGHT_PX, LIST_EVENT_ROW_GAP_PX, LIST_EVENT_ROW_HEIGHT_PX } from "@/chip/eventchip/EventChip.list.placement";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { buildScheduleVirtualRailDays, getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarListViewProps = {
  days: Date[];
  virtualRail?: ScheduleVirtualRail;
  events: GoogleCalendarEvent[];
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
  dayHeights?: Record<string, number>;
  scrollViewportRef?: MutableRefObject<HTMLDivElement | null>;
  onScrollTopChange?: (scrollTop: number) => void;
  scrollTargetDate?: Date;
  scrollTargetToken?: number;
  className?: string;
};

type CalendarListDay = {
  date: Date;
  dateKey: string;
  events: GoogleCalendarEvent[];
  isSelected: boolean;
  isToday: boolean;
};

type VirtualRange = {
  start: number;
  end: number;
};

type CalendarListDynamicHeightEntry = {
  index: number;
  extraHeight: number;
  accumulatedExtraHeight: number;
};

type CalendarListVirtualMetrics = {
  dynamicHeightEntries: CalendarListDynamicHeightEntry[];
  totalHeight: number;
};

type CalendarListEventIndex = Map<string, GoogleCalendarEvent[]>;

type CalendarListDaySectionProps = {
  day: CalendarListDay;
  onSelectDate?: (date: Date) => void;
};

const EMPTY_DAY_LABEL = "予定なし";
const SELECTED_OFFSET = 8;
const ANCHOR_OFFSET = 160;
const LOCAL_DAYS = 3650;
const LIST_VIRTUAL_BASE_DAY_HEIGHT_PX = LIST_EMPTY_DAY_HEIGHT_PX;
const LIST_VIRTUAL_BASE_DAY_BLOCK_HEIGHT_PX = LIST_VIRTUAL_BASE_DAY_HEIGHT_PX + LIST_DAY_GAP_PX;
const LIST_MATERIALIZE_OVERSCAN_PX = 8_000;
const LIST_MAX_RANGE_UPDATE_GUARD_PX = 8_000;
const DATE_KEY_PART_COUNT = 3;
const LIST_DAY_RAIL_CLASS_NAME = "pointer-events-none absolute -bottom-2 left-[43px] top-0 w-px -translate-x-1/2 bg-[#eceff3] md:left-[67px]";
const DAY_DATE_NUMBER_CLASS_NAME = "flex h-8 w-8 items-center justify-center rounded-full text-[16px] font-bold leading-none tracking-[-0.03em] tabular-nums transition-all duration-150";
const DAY_WEEKDAY_CLASS_NAME = "text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]";
const SELECTED_DAY_DATE_NUMBER_CLASS_NAME = "border-0 bg-[var(--ds-color-tag-sky-bg)] text-[var(--ds-color-tag-sky-fg)] shadow-none ring-0";

const createRail = (selectedDate: Date): ScheduleVirtualRail => ({ startDate: subDays(startOfMonth(selectedDate), LOCAL_DAYS), anchorIndex: LOCAL_DAYS, totalDayCount: LOCAL_DAYS * 2 + getDaysInMonth(selectedDate) });

const getIndexForDate = (rail: ScheduleVirtualRail, date: Date): number => differenceInCalendarDays(date, rail.startDate);

const parseCalendarDateKey = (dateKey: string): Date | null => {
  const parts = dateKey.split("-");
  if (parts.length !== DATE_KEY_PART_COUNT) return null;

  const [year, month, day] = parts.map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
};

const getListDayEstimatedHeightFromEventCount = (eventCount: number): number => {
  if (eventCount === 0) return LIST_EMPTY_DAY_HEIGHT_PX;

  return eventCount * LIST_EVENT_ROW_HEIGHT_PX + Math.max(0, eventCount - 1) * LIST_EVENT_ROW_GAP_PX;
};

const getListDayEstimatedHeight = (day: CalendarListDay): number => getListDayEstimatedHeightFromEventCount(day.events.length);

const getRenderedDayHeight = (dayHeights: Record<string, number> | undefined, day: CalendarListDay): number => Math.max(LIST_EMPTY_DAY_HEIGHT_PX, dayHeights?.[day.dateKey] ?? getListDayEstimatedHeight(day));

const addExtraHeightForDateKey = (extraHeightByIndex: Map<number, number>, rail: ScheduleVirtualRail, totalDayCount: number, dateKey: string, height: number) => {
  const date = parseCalendarDateKey(dateKey);
  if (!date) return;

  const index = getIndexForDate(rail, date);
  if (index < 0 || index >= totalDayCount) return;

  const extraHeight = Math.max(0, height - LIST_VIRTUAL_BASE_DAY_HEIGHT_PX);
  if (extraHeight <= 0) return;

  extraHeightByIndex.set(index, Math.max(extraHeightByIndex.get(index) ?? 0, extraHeight));
};

const buildCalendarListEventIndex = (rail: ScheduleVirtualRail, totalDayCount: number, events: GoogleCalendarEvent[]): CalendarListEventIndex => {
  const eventsByDateKey: CalendarListEventIndex = new Map();

  events.forEach((event) => {
    getEventDateKeys(event).forEach((dateKey) => {
      const date = parseCalendarDateKey(dateKey);
      if (!date) return;

      const index = getIndexForDate(rail, date);
      if (index < 0 || index >= totalDayCount) return;

      const dayEvents = eventsByDateKey.get(dateKey) ?? [];
      if (!eventsByDateKey.has(dateKey)) eventsByDateKey.set(dateKey, dayEvents);

      if (event.isAllDay) {
        dayEvents.push(event);
        return;
      }

      const clipped = clipEventToDay(event, date);
      if (clipped) dayEvents.push(clipped);
    });
  });

  eventsByDateKey.forEach((dayEvents) => dayEvents.sort(compareCalendarEvents));

  return eventsByDateKey;
};

const buildCalendarListVirtualMetrics = (rail: ScheduleVirtualRail, totalDayCount: number, eventsByDateKey: CalendarListEventIndex, dayHeights: Record<string, number> | undefined): CalendarListVirtualMetrics => {
  if (totalDayCount <= 0) return { dynamicHeightEntries: [], totalHeight: 0 };

  const extraHeightByIndex = new Map<number, number>();

  eventsByDateKey.forEach((dayEvents, dateKey) => {
    addExtraHeightForDateKey(extraHeightByIndex, rail, totalDayCount, dateKey, getListDayEstimatedHeightFromEventCount(dayEvents.length));
  });

  Object.entries(dayHeights ?? {}).forEach(([dateKey, height]) => {
    addExtraHeightForDateKey(extraHeightByIndex, rail, totalDayCount, dateKey, Math.max(LIST_EMPTY_DAY_HEIGHT_PX, height));
  });

  let accumulatedExtraHeight = 0;
  const dynamicHeightEntries = Array.from(extraHeightByIndex.entries()).sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex).map(([index, extraHeight]) => {
    accumulatedExtraHeight += extraHeight;

    return { index, extraHeight, accumulatedExtraHeight };
  });
  const baseHeight = totalDayCount * LIST_VIRTUAL_BASE_DAY_BLOCK_HEIGHT_PX - LIST_DAY_GAP_PX;

  return { dynamicHeightEntries, totalHeight: Math.max(0, baseHeight + accumulatedExtraHeight) };
};

const getAccumulatedExtraHeightBeforeIndex = (metrics: CalendarListVirtualMetrics, dayIndex: number): number => {
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

const getDayTop = (metrics: CalendarListVirtualMetrics, dayIndex: number): number => dayIndex * LIST_VIRTUAL_BASE_DAY_BLOCK_HEIGHT_PX + getAccumulatedExtraHeightBeforeIndex(metrics, dayIndex);

const getDayIndexAtOffset = (metrics: CalendarListVirtualMetrics, totalDayCount: number, offset: number): number => {
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

const getRange = (metrics: CalendarListVirtualMetrics, scrollTop: number, viewportHeight: number, totalDayCount: number, overscan: number): VirtualRange => {
  if (totalDayCount <= 0) return { start: 0, end: 0 };

  const start = getDayIndexAtOffset(metrics, totalDayCount, scrollTop - overscan);
  const end = Math.min(totalDayCount, getDayIndexAtOffset(metrics, totalDayCount, scrollTop + viewportHeight + overscan) + 2);

  return { start, end: Math.max(start, end) };
};

const sameRange = (left: VirtualRange, right: VirtualRange): boolean => left.start === right.start && left.end === right.end;

const getRangeUpdateGuard = (overscan: number): number => Math.min(LIST_MAX_RANGE_UPDATE_GUARD_PX, Math.max(0, overscan / 2));

const shouldRefreshRange = (element: HTMLDivElement, metrics: CalendarListVirtualMetrics, range: VirtualRange, overscan: number): boolean => {
  if (range.end <= range.start) return true;
  const visibleTop = element.scrollTop;
  const visibleBottom = element.scrollTop + element.clientHeight;
  const guard = getRangeUpdateGuard(overscan);
  return visibleTop < getDayTop(metrics, range.start) + guard || visibleBottom > getDayTop(metrics, range.end) - guard;
};

const getSelectedDateScrollTop = (metrics: CalendarListVirtualMetrics, selectedIndex: number, totalDayCount: number): number => {
  if (selectedIndex < 0 || selectedIndex >= totalDayCount) return 0;

  return Math.max(0, getDayTop(metrics, selectedIndex) - SELECTED_OFFSET);
};

const getSelectedDateRange = (metrics: CalendarListVirtualMetrics, selectedIndex: number, totalDayCount: number): VirtualRange => {
  const scrollTop = getSelectedDateScrollTop(metrics, selectedIndex, totalDayCount);

  return getRange(metrics, scrollTop, 0, totalDayCount, LIST_MATERIALIZE_OVERSCAN_PX);
};

const getEventInstanceKey = (dateKey: string, event: GoogleCalendarEvent): string => `${dateKey}:${event.id}:${new Date(event.startsAt).getTime()}:${new Date(event.endsAt).getTime()}`;

const buildListDays = (days: Date[], eventsByDateKey: CalendarListEventIndex, selectedDate: Date): CalendarListDay[] => {
  const today = new Date();

  return days.map((date) => {
    const dateKey = getCalendarDateKey(date);
    const dayEvents = eventsByDateKey.get(dateKey) ?? [];
    return { date, dateKey, events: dayEvents, isSelected: isSameDay(date, selectedDate), isToday: isSameDay(date, today) };
  });
};

const getMonthVisibilityKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}`;

const createVirtualDayStyle = (metrics: CalendarListVirtualMetrics, dayIndex: number, height: number): CSSProperties => ({
  contain: "layout style paint",
  contentVisibility: "auto",
  containIntrinsicSize: `${height}px`,
  height,
  transform: `translate3d(0, ${getDayTop(metrics, dayIndex)}px, 0)`,
  willChange: "transform",
});

const getDayDateNumberClassName = (day: CalendarListDay): string => cn(DAY_DATE_NUMBER_CLASS_NAME, day.isSelected ? SELECTED_DAY_DATE_NUMBER_CLASS_NAME : day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]");

const EmptyDayCard = () => <div className="grid h-full min-h-[38px] grid-cols-[30px_26px_minmax(0,1fr)] items-stretch md:grid-cols-[54px_26px_minmax(0,1fr)]"><div className="pt-2.5 text-right text-[12px] font-medium leading-none text-[#b3b3b3]">—</div><div className="relative flex justify-center"><span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#dedede]" aria-hidden="true" /><span className="relative mt-[8px] h-2 w-2 rounded-full border border-[#dedede] bg-white" aria-hidden="true" /></div><div className="flex h-[34px] items-center rounded-[10px] border border-dashed border-[#dedede] bg-white px-3 text-[12px] font-semibold text-[#8e8e93]">{EMPTY_DAY_LABEL}</div></div>;

const CalendarListDaySectionComponent = ({ day, onSelectDate }: CalendarListDaySectionProps) => <section className="grid h-full grid-cols-[72px_minmax(0,1fr)] gap-1 md:grid-cols-[108px_minmax(0,1fr)] md:gap-2" aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}><button type="button" className="group mt-0.5 flex h-8 items-center justify-end gap-1 rounded-[10px] pr-0.5 text-right transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25" onClick={() => onSelectDate?.(day.date)}><span className={getDayDateNumberClassName(day)}>{format(day.date, "d")}</span><span className={DAY_WEEKDAY_CLASS_NAME}>{format(day.date, "EEE", { locale: ja })}</span></button><div className="relative h-full overflow-visible"><span className={LIST_DAY_RAIL_CLASS_NAME} aria-hidden="true" /><div className="relative h-full space-y-1.5 overflow-hidden">{day.events.length > 0 ? day.events.map((event) => <CalendarEventChipList key={getEventInstanceKey(day.dateKey, event)} event={event} />) : <EmptyDayCard />}</div></div></section>;

const CalendarListDaySection = memo(CalendarListDaySectionComponent);

CalendarListDaySection.displayName = "CalendarListDaySection";

const CalendarListViewComponent = ({ virtualRail, events, selectedDate, onSelectDate, onVisibleMonthChange, dayHeights, scrollViewportRef: externalRef, onScrollTopChange, scrollTargetDate, scrollTargetToken, className }: CalendarListViewProps) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = externalRef ?? localRef;
  const resolvedScrollTargetDate = scrollTargetDate ?? selectedDate;
  const rail = useMemo(() => virtualRail ?? createRail(resolvedScrollTargetDate), [resolvedScrollTargetDate, virtualRail]);
  const eventsByDateKey = useMemo(() => buildCalendarListEventIndex(rail, rail.totalDayCount, events), [events, rail]);
  const metrics = useMemo(() => buildCalendarListVirtualMetrics(rail, rail.totalDayCount, eventsByDateKey, dayHeights), [dayHeights, eventsByDateKey, rail]);
  const selectedDateKey = useMemo(() => getCalendarDateKey(selectedDate), [selectedDate]);
  const scrollTargetDateKey = useMemo(() => getCalendarDateKey(resolvedScrollTargetDate), [resolvedScrollTargetDate]);
  const scrollTargetIndex = useMemo(() => getIndexForDate(rail, resolvedScrollTargetDate), [rail, resolvedScrollTargetDate]);
  const initialRange = useMemo(() => getSelectedDateRange(metrics, scrollTargetIndex, rail.totalDayCount), [metrics, rail.totalDayCount, scrollTargetIndex]);
  const [range, setRange] = useState<VirtualRange>(() => initialRange);
  const rangeRef = useRef(range);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTargetSignatureRef = useRef<string | null>(null);
  const lastVisibleRef = useRef<string | null>(null);
  const dates = useMemo(() => buildScheduleVirtualRailDays(rail, range.start, range.end), [rail, range.end, range.start]);
  const days = useMemo(() => buildListDays(dates, eventsByDateKey, selectedDate), [dates, eventsByDateKey, selectedDate]);
  const totalHeight = metrics.totalHeight;
  const scrollTargetSignature = scrollTargetToken === undefined ? scrollTargetDateKey : `${scrollTargetToken}`;

  const setRangeIfChanged = useCallback((next: VirtualRange) => { if (sameRange(rangeRef.current, next)) return; rangeRef.current = next; setRange(next); }, []);
  const updateRange = useCallback((element: HTMLDivElement | null, force = false) => { if (!element) return; if (!force && !shouldRefreshRange(element, metrics, rangeRef.current, LIST_MATERIALIZE_OVERSCAN_PX)) return; setRangeIfChanged(getRange(metrics, element.scrollTop, element.clientHeight, rail.totalDayCount, LIST_MATERIALIZE_OVERSCAN_PX)); }, [metrics, rail.totalDayCount, setRangeIfChanged]);
  const updateVisibleDate = useCallback((element: HTMLDivElement | null) => { if (!element || !onVisibleMonthChange) return; const index = getDayIndexAtOffset(metrics, rail.totalDayCount, element.scrollTop + Math.min(ANCHOR_OFFSET, element.clientHeight / 2)); const date = getScheduleVirtualRailDate(rail, index); if (!date) return; const key = getMonthVisibilityKey(date); if (lastVisibleRef.current === key) return; lastVisibleRef.current = key; onVisibleMonthChange(date); }, [metrics, onVisibleMonthChange, rail]);
  const scheduleScrollWork = useCallback((element: HTMLDivElement) => { pendingRef.current = element; if (frameRef.current !== null) return; frameRef.current = window.requestAnimationFrame(() => { frameRef.current = null; const pending = pendingRef.current; pendingRef.current = null; if (!pending) return; updateRange(pending); updateVisibleDate(pending); onScrollTopChange?.(pending.scrollTop); }); }, [onScrollTopChange, updateRange, updateVisibleDate]);

  useLayoutEffect(() => { const element = scrollRef.current; if (!element || lastScrollTargetSignatureRef.current === scrollTargetSignature || scrollTargetIndex < 0 || scrollTargetIndex >= rail.totalDayCount) return; lastScrollTargetSignatureRef.current = scrollTargetSignature; element.scrollTop = getSelectedDateScrollTop(metrics, scrollTargetIndex, rail.totalDayCount); updateRange(element, true); }, [metrics, rail.totalDayCount, scrollRef, scrollTargetIndex, scrollTargetSignature, updateRange]);
  useLayoutEffect(() => { updateRange(scrollRef.current, true); }, [scrollRef, updateRange]);
  useEffect(() => { const element = scrollRef.current; if (!element) return; const handleScroll = () => scheduleScrollWork(element); element.addEventListener("scroll", handleScroll, { passive: true }); return () => element.removeEventListener("scroll", handleScroll); }, [scheduleScrollWork, scrollRef]);
  useEffect(() => () => { if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current); }, []);

  return <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-white", className)}><div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-6 pt-2 scrollbar-hidden md:px-4"><div className="mx-auto w-full max-w-[940px]"><div className="relative w-full" style={{ height: totalHeight }}>{days.map((day, offset) => { const dayIndex = range.start + offset; const height = getRenderedDayHeight(dayHeights, day); return <div key={day.dateKey} className="absolute left-0 right-0 top-0" style={createVirtualDayStyle(metrics, dayIndex, height)}><CalendarListDaySection day={day} onSelectDate={onSelectDate} /></div>; })}</div></div></div></div>;
};

const CalendarListView = memo(CalendarListViewComponent);

CalendarListView.displayName = "CalendarListView";

export { CalendarListView };
