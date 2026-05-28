import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type UIEvent } from "react";
import { differenceInCalendarDays, format, getDaysInMonth, isSameDay, startOfMonth, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { LIST_DAY_GAP_PX, LIST_DAY_SECTION_MIN_HEIGHT_PX, LIST_EMPTY_DAY_HEIGHT_PX, LIST_EVENT_ROW_GAP_PX, LIST_EVENT_ROW_HEIGHT_PX } from "@/chip/eventchip/EventChip.list.placement";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { buildScheduleVirtualRailDays, getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarDayHeightMap = Record<string, number>;

type CalendarListViewProps = {
  days: Date[];
  virtualRail?: ScheduleVirtualRail;
  events: GoogleCalendarEvent[];
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
  onReachStart?: () => void;
  onReachEnd?: () => void;
  onVisibleMonthChange?: (date: Date) => void;
  dayHeights?: CalendarDayHeightMap;
  scrollViewportRef?: MutableRefObject<HTMLDivElement | null>;
  onScrollTopChange?: (scrollTop: number) => void;
  className?: string;
};

type CalendarListDay = {
  date: Date;
  dateKey: string;
  events: GoogleCalendarEvent[];
  isSelected: boolean;
  isToday: boolean;
};

type CalendarListDaySectionProps = {
  day: CalendarListDay;
  onSelectDate?: (date: Date) => void;
};

type CalendarListVirtualRange = {
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

const EMPTY_DAY_LABEL = "予定なし";
const SELECTED_DAY_SCROLL_BLOCK_OFFSET_PX = 8;
const LIST_VISIBLE_MONTH_ANCHOR_PX = 160;
const LIST_VIRTUAL_OVERSCAN_PX = 3_000;
const LIST_LOCAL_RAIL_DAYS = 3650;
const LIST_DAY_RAIL_CLASS_NAME = "pointer-events-none absolute -bottom-2 left-[67px] top-0 w-px -translate-x-1/2 bg-[#eceff3]";
const DATE_KEY_PART_COUNT = 3;

const createLocalVirtualRail = (selectedDate: Date): ScheduleVirtualRail => ({
  startDate: subDays(startOfMonth(selectedDate), LIST_LOCAL_RAIL_DAYS),
  anchorIndex: LIST_LOCAL_RAIL_DAYS,
  totalDayCount: LIST_LOCAL_RAIL_DAYS * 2 + getDaysInMonth(selectedDate),
});

const getEventInstanceKey = (dateKey: string, event: GoogleCalendarEvent): string => {
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt).getTime();

  return `${dateKey}:${event.id}:${startsAt}:${endsAt}`;
};

const buildListDays = (days: Date[], events: GoogleCalendarEvent[], selectedDate: Date): CalendarListDay[] => {
  const today = new Date();
  const eventsByDay = new Map<string, GoogleCalendarEvent[]>();
  const dayByKey = new Map<string, Date>();

  days.forEach((day) => {
    const dayKey = getCalendarDateKey(day);

    dayByKey.set(dayKey, day);
    eventsByDay.set(dayKey, []);
  });

  events.forEach((event) => {
    getEventDateKeys(event).forEach((dayKey) => {
      const day = dayByKey.get(dayKey);
      const dayEvents = eventsByDay.get(dayKey);

      if (!day || !dayEvents) return;

      if (event.isAllDay) {
        dayEvents.push(event);
        return;
      }

      const clippedEvent = clipEventToDay(event, day);
      if (clippedEvent) {
        dayEvents.push(clippedEvent);
      }
    });
  });

  return days.map((date) => {
    const dateKey = getCalendarDateKey(date);
    const dayEvents = eventsByDay.get(dateKey) ?? [];

    dayEvents.sort(compareCalendarEvents);

    return {
      date,
      dateKey,
      events: dayEvents,
      isSelected: isSameDay(date, selectedDate),
      isToday: isSameDay(date, today),
    };
  });
};

const getRailIndexForDate = (rail: ScheduleVirtualRail, date: Date): number => differenceInCalendarDays(date, rail.startDate);

const getListDayEstimatedHeightFromEventCount = (eventCount: number): number => {
  if (eventCount === 0) return LIST_EMPTY_DAY_HEIGHT_PX;

  return eventCount * LIST_EVENT_ROW_HEIGHT_PX + Math.max(0, eventCount - 1) * LIST_EVENT_ROW_GAP_PX;
};

const getListDayEstimatedHeight = (day: CalendarListDay): number => getListDayEstimatedHeightFromEventCount(day.events.length);

const getRenderedDayHeight = (dayHeights: CalendarDayHeightMap | undefined, day: CalendarListDay): number => Math.max(LIST_DAY_SECTION_MIN_HEIGHT_PX, dayHeights?.[day.dateKey] ?? getListDayEstimatedHeight(day));

const getRailDayBlockHeight = () => LIST_DAY_SECTION_MIN_HEIGHT_PX + LIST_DAY_GAP_PX;

const parseCalendarDateKey = (dateKey: string): Date | null => {
  const parts = dateKey.split("-");
  if (parts.length !== DATE_KEY_PART_COUNT) return null;

  const [year, month, day] = parts.map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
};

const addExtraHeightForDateKey = (extraHeightByIndex: Map<number, number>, rail: ScheduleVirtualRail, totalDayCount: number, dateKey: string, height: number) => {
  const date = parseCalendarDateKey(dateKey);
  if (!date) return;

  const index = getRailIndexForDate(rail, date);
  if (index < 0 || index >= totalDayCount) return;

  const extraHeight = Math.max(0, height - LIST_DAY_SECTION_MIN_HEIGHT_PX);
  if (extraHeight <= 0) return;

  extraHeightByIndex.set(index, Math.max(extraHeightByIndex.get(index) ?? 0, extraHeight));
};

const buildCalendarListVirtualMetrics = (rail: ScheduleVirtualRail, totalDayCount: number, events: GoogleCalendarEvent[], dayHeights: CalendarDayHeightMap | undefined): CalendarListVirtualMetrics => {
  if (totalDayCount <= 0) return { dynamicHeightEntries: [], totalHeight: 0 };

  const eventCountByDateKey = new Map<string, number>();
  const extraHeightByIndex = new Map<number, number>();

  events.forEach((event) => {
    getEventDateKeys(event).forEach((dateKey) => {
      eventCountByDateKey.set(dateKey, (eventCountByDateKey.get(dateKey) ?? 0) + 1);
    });
  });

  eventCountByDateKey.forEach((eventCount, dateKey) => {
    const height = Math.max(LIST_DAY_SECTION_MIN_HEIGHT_PX, dayHeights?.[dateKey] ?? getListDayEstimatedHeightFromEventCount(eventCount));

    addExtraHeightForDateKey(extraHeightByIndex, rail, totalDayCount, dateKey, height);
  });

  Object.entries(dayHeights ?? {}).forEach(([dateKey, height]) => {
    addExtraHeightForDateKey(extraHeightByIndex, rail, totalDayCount, dateKey, height);
  });

  let accumulatedExtraHeight = 0;
  const dynamicHeightEntries = Array.from(extraHeightByIndex.entries()).sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex).map(([index, extraHeight]) => {
    accumulatedExtraHeight += extraHeight;

    return { index, extraHeight, accumulatedExtraHeight };
  });
  const baseHeight = totalDayCount * getRailDayBlockHeight() - LIST_DAY_GAP_PX;

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

const getDayTop = (metrics: CalendarListVirtualMetrics, dayIndex: number): number => dayIndex * getRailDayBlockHeight() + getAccumulatedExtraHeightBeforeIndex(metrics, dayIndex);

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

const getVirtualRange = (metrics: CalendarListVirtualMetrics, scrollTop: number, viewportHeight: number, totalDayCount: number): CalendarListVirtualRange => {
  if (totalDayCount <= 0) return { start: 0, end: 0 };

  const start = getDayIndexAtOffset(metrics, totalDayCount, scrollTop - LIST_VIRTUAL_OVERSCAN_PX);
  const end = Math.min(totalDayCount, getDayIndexAtOffset(metrics, totalDayCount, scrollTop + viewportHeight + LIST_VIRTUAL_OVERSCAN_PX) + 2);

  return { start, end: Math.max(start, end) };
};

const areVirtualRangesEqual = (left: CalendarListVirtualRange, right: CalendarListVirtualRange): boolean => left.start === right.start && left.end === right.end;

const EmptyDayCard = () => (
  <div className="grid h-full min-h-[38px] grid-cols-[54px_26px_minmax(0,1fr)] items-stretch">
    <div className="pt-2.5 text-right text-[12px] font-medium leading-none text-[#b3b3b3]">—</div>
    <div className="relative flex justify-center">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#dedede]" aria-hidden="true" />
      <span className="relative mt-[8px] h-2 w-2 rounded-full border border-[#dedede] bg-white" aria-hidden="true" />
    </div>
    <div className="flex h-[34px] items-center rounded-[10px] border border-dashed border-[#dedede] bg-white px-3 text-[12px] font-semibold text-[#8e8e93]">
      {EMPTY_DAY_LABEL}
    </div>
  </div>
);

const CalendarListDaySectionComponent = ({ day, onSelectDate }: CalendarListDaySectionProps) => {
  return (
    <section className="grid h-full grid-cols-[58px_minmax(0,1fr)] gap-2" aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}>
      <button type="button" className={cn("group mt-0.5 flex h-8 items-baseline justify-end gap-1 rounded-[10px] pr-0.5 text-right transition", "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25", day.isSelected && "text-[#1c1c1e]")} onClick={() => onSelectDate?.(day.date)}>
        <span className={cn("text-[16px] font-bold leading-none tracking-[-0.03em]", day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]")}>{format(day.date, "d")}</span>
        <span className="text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]">{format(day.date, "EEE", { locale: ja })}</span>
      </button>

      <div className="relative h-full overflow-visible">
        <span className={LIST_DAY_RAIL_CLASS_NAME} aria-hidden="true" />
        <div className="relative h-full space-y-1.5 overflow-hidden">
          {day.events.length > 0 ? day.events.map((event) => <CalendarEventChipList key={getEventInstanceKey(day.dateKey, event)} event={event} />) : <EmptyDayCard />}
        </div>
      </div>
    </section>
  );
};

const CalendarListViewComponent = ({
  virtualRail,
  events,
  selectedDate,
  onSelectDate,
  onVisibleMonthChange,
  dayHeights,
  scrollViewportRef: externalScrollViewportRef,
  onScrollTopChange,
  className,
}: CalendarListViewProps) => {
  const localScrollViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = externalScrollViewportRef ?? localScrollViewportRef;
  const lastSelectedDateTimeRef = useRef<number | null>(null);
  const lastVisibleDateKeyRef = useRef<string | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const pendingScrollElementRef = useRef<HTMLDivElement | null>(null);
  const resolvedRail = useMemo(() => virtualRail ?? createLocalVirtualRail(selectedDate), [selectedDate, virtualRail]);
  const totalDayCount = resolvedRail.totalDayCount;
  const metrics = useMemo(() => buildCalendarListVirtualMetrics(resolvedRail, totalDayCount, events, dayHeights), [dayHeights, events, resolvedRail, totalDayCount]);
  const [virtualRange, setVirtualRange] = useState<CalendarListVirtualRange>(() => ({ start: 0, end: 1 }));
  const renderedDates = useMemo(() => buildScheduleVirtualRailDays(resolvedRail, virtualRange.start, virtualRange.end), [resolvedRail, virtualRange.end, virtualRange.start]);
  const renderedDays = useMemo(() => buildListDays(renderedDates, events, selectedDate), [events, renderedDates, selectedDate]);
  const totalHeight = metrics.totalHeight;

  const getDynamicDayTop = useCallback((dayIndex: number) => getDayTop(metrics, dayIndex), [metrics]);
  const getDayHeight = useCallback((day: CalendarListDay) => getRenderedDayHeight(dayHeights, day), [dayHeights]);

  const updateVirtualRange = useCallback((scrollElement: HTMLDivElement | null) => {
    const nextRange = scrollElement ? getVirtualRange(metrics, scrollElement.scrollTop, scrollElement.clientHeight, totalDayCount) : getVirtualRange(metrics, 0, 0, totalDayCount);

    setVirtualRange((currentRange) => areVirtualRangesEqual(currentRange, nextRange) ? currentRange : nextRange);
  }, [metrics, totalDayCount]);

  const updateVisibleMonth = useCallback((scrollElement: HTMLDivElement | null) => {
    if (!scrollElement || !onVisibleMonthChange || totalDayCount <= 0) return;

    const anchorOffset = scrollElement.scrollTop + Math.min(LIST_VISIBLE_MONTH_ANCHOR_PX, scrollElement.clientHeight / 2);
    const anchorIndex = getDayIndexAtOffset(metrics, totalDayCount, anchorOffset);
    const anchorDate = getScheduleVirtualRailDate(resolvedRail, anchorIndex);
    if (!anchorDate) return;

    const visibleDateKey = getCalendarDateKey(anchorDate);
    if (lastVisibleDateKeyRef.current === visibleDateKey) return;

    lastVisibleDateKeyRef.current = visibleDateKey;
    onVisibleMonthChange(anchorDate);
  }, [metrics, onVisibleMonthChange, resolvedRail, totalDayCount]);

  const processScroll = useCallback((scrollElement: HTMLDivElement) => {
    updateVirtualRange(scrollElement);
    updateVisibleMonth(scrollElement);
    onScrollTopChange?.(scrollElement.scrollTop);
  }, [onScrollTopChange, updateVirtualRange, updateVisibleMonth]);

  const requestScrollProcessing = useCallback((scrollElement: HTMLDivElement) => {
    pendingScrollElementRef.current = scrollElement;

    if (scrollFrameRef.current != null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const pendingScrollElement = pendingScrollElementRef.current;
      pendingScrollElementRef.current = null;

      if (pendingScrollElement) {
        processScroll(pendingScrollElement);
      }
    });
  }, [processScroll]);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    requestScrollProcessing(event.currentTarget);
  }, [requestScrollProcessing]);

  useLayoutEffect(() => {
    updateVirtualRange(scrollViewportRef.current);
  }, [scrollViewportRef, updateVirtualRange]);

  useEffect(() => {
    const selectedDateTime = selectedDate.getTime();
    const scrollElement = scrollViewportRef.current;
    const selectedDayIndex = getRailIndexForDate(resolvedRail, selectedDate);
    if (lastSelectedDateTimeRef.current === selectedDateTime || !scrollElement || selectedDayIndex < 0 || selectedDayIndex >= totalDayCount) return;

    lastSelectedDateTimeRef.current = selectedDateTime;
    scrollElement.scrollTop = Math.max(0, getDynamicDayTop(selectedDayIndex) - SELECTED_DAY_SCROLL_BLOCK_OFFSET_PX);
    updateVirtualRange(scrollElement);
  }, [getDynamicDayTop, resolvedRail, scrollViewportRef, selectedDate, totalDayCount, updateVirtualRange]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current != null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-white", className)}>
      <div ref={scrollViewportRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 scrollbar-hidden" onScroll={handleScroll}>
        <div className="mx-auto w-full max-w-[940px]">
          <div className="relative w-full" style={{ height: totalHeight }}>
            {renderedDays.map((day, index) => {
              const dayIndex = virtualRange.start + index;
              const height = getDayHeight(day);

              return (
                <div key={day.dateKey} className="absolute left-0 right-0" style={{ contain: "layout style", top: getDynamicDayTop(dayIndex), height }}>
                  <CalendarListDaySection day={day} onSelectDate={onSelectDate} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const CalendarListDaySection = memo(CalendarListDaySectionComponent);

CalendarListDaySection.displayName = "CalendarListDaySection";

const CalendarListView = memo(CalendarListViewComponent);

CalendarListView.displayName = "CalendarListView";

export { CalendarListView };
