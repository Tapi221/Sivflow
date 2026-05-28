import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type UIEvent } from "react";
import { addDays, format, getDaysInMonth, isSameDay, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarDayHeightMap = Record<string, number>;

type CalendarListViewProps = {
  days: Date[];
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
  selectedDayRef?: (node: HTMLElement | null) => void;
  onSelectDate?: (date: Date) => void;
};

type CalendarListVirtualMetrics = {
  heights: number[];
  offsets: number[];
  totalHeight: number;
};

type CalendarListVirtualRange = {
  start: number;
  end: number;
};

const EMPTY_DAY_LABEL = "予定なし";
const EMPTY_MONTH_LABEL = "この期間の予定はありません";
const SELECTED_DAY_SCROLL_BLOCK_OFFSET_PX = 8;
const LIST_SCROLL_EDGE_THRESHOLD_PX = 180;
const LIST_SCROLL_EDGE_RESET_PX = 420;
const LIST_SCROLL_IDLE_DELAY_MS = 120;
const LIST_VISIBLE_MONTH_ANCHOR_PX = 160;
const LIST_VIRTUAL_OVERSCAN_PX = 2_400;
const LIST_DAY_GAP_PX = 8;
const LIST_EMPTY_DAY_HEIGHT_PX = 38;
const LIST_EVENT_ROW_HEIGHT_PX = 58;
const LIST_EVENT_ROW_GAP_PX = 6;

const buildMonthDays = (date: Date): Date[] => {
  const monthStart = startOfMonth(date);

  return Array.from({ length: getDaysInMonth(monthStart) }, (_, index) =>
    addDays(monthStart, index),
  );
};

const getEventInstanceKey = (dateKey: string, event: GoogleCalendarEvent): string => {
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt).getTime();

  return `${dateKey}:${event.id}:${startsAt}:${endsAt}`;
};

const buildListDays = (
  days: Date[],
  events: GoogleCalendarEvent[],
  selectedDate: Date,
): CalendarListDay[] => {
  const resolvedDays = days.length > 0 ? days : buildMonthDays(selectedDate);
  const today = new Date();
  const eventsByDay = new Map<string, GoogleCalendarEvent[]>();
  const dayByKey = new Map<string, Date>();

  resolvedDays.forEach((day) => {
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

  return resolvedDays.map((date) => {
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

const getListDayEstimatedHeight = (day: CalendarListDay): number => {
  if (day.events.length === 0) return LIST_EMPTY_DAY_HEIGHT_PX;

  return day.events.length * LIST_EVENT_ROW_HEIGHT_PX + Math.max(0, day.events.length - 1) * LIST_EVENT_ROW_GAP_PX;
};

const getAlignedDayHeight = (
  dayHeights: CalendarDayHeightMap | undefined,
  day: CalendarListDay,
): number => dayHeights?.[day.dateKey] ?? getListDayEstimatedHeight(day);

const buildVirtualMetrics = (
  listDays: CalendarListDay[],
  dayHeights?: CalendarDayHeightMap,
): CalendarListVirtualMetrics => {
  let totalHeight = 0;
  const offsets: number[] = [];
  const heights = listDays.map((day, index) => {
    const dayHeight = getAlignedDayHeight(dayHeights, day);
    const height = dayHeight + (index < listDays.length - 1 ? LIST_DAY_GAP_PX : 0);

    offsets.push(totalHeight);
    totalHeight += height;

    return height;
  });

  return { heights, offsets, totalHeight };
};

const findVirtualIndex = (offsets: number[], targetOffset: number): number => {
  if (offsets.length === 0) return 0;

  let low = 0;
  let high = offsets.length - 1;
  let result = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (offsets[middle] <= targetOffset) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return result;
};

const getVirtualRange = (
  metrics: CalendarListVirtualMetrics,
  scrollTop: number,
  viewportHeight: number,
): CalendarListVirtualRange => {
  if (metrics.heights.length === 0) return { start: 0, end: 0 };

  const rangeStartOffset = Math.max(0, scrollTop - LIST_VIRTUAL_OVERSCAN_PX);
  const rangeEndOffset = scrollTop + viewportHeight + LIST_VIRTUAL_OVERSCAN_PX;
  const start = findVirtualIndex(metrics.offsets, rangeStartOffset);
  let end = start;

  while (end < metrics.heights.length && metrics.offsets[end] < rangeEndOffset) {
    end += 1;
  }

  return {
    start,
    end: Math.min(metrics.heights.length, end + 1),
  };
};

const areVirtualRangesEqual = (
  left: CalendarListVirtualRange,
  right: CalendarListVirtualRange,
): boolean => left.start === right.start && left.end === right.end;

const getVisibleMonthAnchorDate = (
  listDays: CalendarListDay[],
  metrics: CalendarListVirtualMetrics,
  targetOffset: number,
): Date | null => {
  const index = findVirtualIndex(metrics.offsets, targetOffset);

  return listDays[index]?.date ?? null;
};

const EmptyDayCard = ({ isMonthEmpty }: { isMonthEmpty: boolean }) => (
  <div className="grid h-full min-h-[38px] grid-cols-[54px_26px_minmax(0,1fr)] items-stretch">
    <div className="pt-2.5 text-right text-[12px] font-medium leading-none text-[#b3b3b3]">
      —
    </div>
    <div className="relative flex justify-center">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#dedede]" aria-hidden="true" />
      <span className="relative mt-[8px] h-2 w-2 rounded-full border border-[#dedede] bg-white" aria-hidden="true" />
    </div>
    <div className="flex h-[34px] items-center rounded-[10px] border border-dashed border-[#dedede] bg-white px-3 text-[12px] font-semibold text-[#8e8e93]">
      {isMonthEmpty ? EMPTY_MONTH_LABEL : EMPTY_DAY_LABEL}
    </div>
  </div>
);

const CalendarListDaySection = ({
  day,
  selectedDayRef,
  onSelectDate,
}: CalendarListDaySectionProps) => {
  return (
    <section
      ref={day.isSelected ? selectedDayRef : undefined}
      className="grid h-full grid-cols-[58px_minmax(0,1fr)] gap-2"
      aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}
    >
      <button
        type="button"
        className={cn(
          "group mt-0.5 flex h-8 items-baseline justify-end gap-1 rounded-[10px] pr-0.5 text-right transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25",
          day.isSelected && "text-[#1c1c1e]",
        )}
        onClick={() => onSelectDate?.(day.date)}
      >
        <span className={cn("text-[16px] font-bold leading-none tracking-[-0.03em]", day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]")}>{format(day.date, "d")}</span>
        <span className="text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]">{format(day.date, "EEE", { locale: ja })}</span>
      </button>

      <div className="h-full space-y-1.5">
        {day.events.length > 0 ? (
          day.events.map((event) => (
            <CalendarEventChipList
              key={getEventInstanceKey(day.dateKey, event)}
              event={event}
            />
          ))
        ) : (
          <EmptyDayCard isMonthEmpty={false} />
        )}
      </div>
    </section>
  );
};

const CalendarListViewComponent = ({
  days,
  events,
  selectedDate,
  onSelectDate,
  onReachStart,
  onReachEnd,
  onVisibleMonthChange,
  dayHeights,
  scrollViewportRef: externalScrollViewportRef,
  onScrollTopChange,
  className,
}: CalendarListViewProps) => {
  const localScrollViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = externalScrollViewportRef ?? localScrollViewportRef;
  const selectedDayElementRef = useRef<HTMLElement | null>(null);
  const previousFirstDayKeyRef = useRef<string | null>(null);
  const previousScrollHeightRef = useRef(0);
  const lastReachStartKeyRef = useRef<string | null>(null);
  const lastReachEndKeyRef = useRef<string | null>(null);
  const lastSelectedDateTimeRef = useRef<number | null>(null);
  const lastVisibleDateKeyRef = useRef<string | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const edgeExtendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollElementRef = useRef<HTMLDivElement | null>(null);
  const pendingEdgeDirectionRef = useRef<"start" | "end" | null>(null);
  const [virtualRange, setVirtualRange] = useState<CalendarListVirtualRange>({ start: 0, end: 0 });
  const listDays = useMemo(
    () => buildListDays(days, events, selectedDate),
    [days, events, selectedDate],
  );
  const virtualMetrics = useMemo(() => buildVirtualMetrics(listDays, dayHeights), [dayHeights, listDays]);
  const isMonthEmpty = listDays.every((day) => day.events.length === 0);
  const firstDayKey = listDays[0]?.dateKey ?? null;
  const lastDayKey = listDays.at(-1)?.dateKey ?? null;
  const renderedDays = listDays.slice(virtualRange.start, virtualRange.end);
  const selectedDayIndex = listDays.findIndex((day) => isSameDay(day.date, selectedDate));

  const updateVirtualRange = useCallback((scrollElement: HTMLDivElement | null) => {
    const nextRange = scrollElement
      ? getVirtualRange(virtualMetrics, scrollElement.scrollTop, scrollElement.clientHeight)
      : getVirtualRange(virtualMetrics, 0, 0);

    setVirtualRange((currentRange) => areVirtualRangesEqual(currentRange, nextRange) ? currentRange : nextRange);
  }, [virtualMetrics]);

  const updateVisibleMonth = useCallback((scrollElement: HTMLDivElement | null) => {
    if (!scrollElement || !onVisibleMonthChange) return;

    const anchorOffset = scrollElement.scrollTop + Math.min(LIST_VISIBLE_MONTH_ANCHOR_PX, scrollElement.clientHeight / 2);
    const anchorDate = getVisibleMonthAnchorDate(listDays, virtualMetrics, anchorOffset);
    if (!anchorDate) return;

    const visibleDateKey = getCalendarDateKey(anchorDate);
    if (lastVisibleDateKeyRef.current === visibleDateKey) return;

    lastVisibleDateKeyRef.current = visibleDateKey;
    onVisibleMonthChange(anchorDate);
  }, [listDays, onVisibleMonthChange, virtualMetrics]);

  const clearEdgeExtendTimer = useCallback(() => {
    if (!edgeExtendTimerRef.current) return;

    clearTimeout(edgeExtendTimerRef.current);
    edgeExtendTimerRef.current = null;
  }, []);

  const requestEdgeExtension = useCallback((direction: "start" | "end") => {
    pendingEdgeDirectionRef.current = direction;
    clearEdgeExtendTimer();

    edgeExtendTimerRef.current = setTimeout(() => {
      edgeExtendTimerRef.current = null;
      const pendingDirection = pendingEdgeDirectionRef.current;
      pendingEdgeDirectionRef.current = null;

      if (pendingDirection === "start") {
        onReachStart?.();
        return;
      }

      if (pendingDirection === "end") {
        onReachEnd?.();
      }
    }, LIST_SCROLL_IDLE_DELAY_MS);
  }, [clearEdgeExtendTimer, onReachEnd, onReachStart]);

  const processScroll = useCallback((scrollElement: HTMLDivElement) => {
    const remainingScrollBottom = scrollElement.scrollHeight - scrollElement.clientHeight - scrollElement.scrollTop;

    updateVirtualRange(scrollElement);
    updateVisibleMonth(scrollElement);

    if (scrollElement.scrollTop <= LIST_SCROLL_EDGE_THRESHOLD_PX) {
      if (firstDayKey && lastReachStartKeyRef.current !== firstDayKey) {
        lastReachStartKeyRef.current = firstDayKey;
        requestEdgeExtension("start");
      }
    } else if (scrollElement.scrollTop >= LIST_SCROLL_EDGE_RESET_PX) {
      lastReachStartKeyRef.current = null;
      if (pendingEdgeDirectionRef.current === "start") {
        pendingEdgeDirectionRef.current = null;
        clearEdgeExtendTimer();
      }
    }

    if (remainingScrollBottom <= LIST_SCROLL_EDGE_THRESHOLD_PX) {
      if (lastDayKey && lastReachEndKeyRef.current !== lastDayKey) {
        lastReachEndKeyRef.current = lastDayKey;
        requestEdgeExtension("end");
      }
    } else if (remainingScrollBottom >= LIST_SCROLL_EDGE_RESET_PX) {
      lastReachEndKeyRef.current = null;
      if (pendingEdgeDirectionRef.current === "end") {
        pendingEdgeDirectionRef.current = null;
        clearEdgeExtendTimer();
      }
    }
  }, [clearEdgeExtendTimer, firstDayKey, lastDayKey, requestEdgeExtension, updateVirtualRange, updateVisibleMonth]);

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
    updateVirtualRange(event.currentTarget);
    requestScrollProcessing(event.currentTarget);
    onScrollTopChange?.(event.currentTarget.scrollTop);
  }, [onScrollTopChange, requestScrollProcessing, updateVirtualRange]);

  useLayoutEffect(() => {
    const scrollElement = scrollViewportRef.current;
    const previousFirstDayKey = previousFirstDayKeyRef.current;
    const previousScrollHeight = previousScrollHeightRef.current;

    if (
      scrollElement &&
      previousFirstDayKey &&
      firstDayKey &&
      previousFirstDayKey !== firstDayKey &&
      listDays.some((day) => day.dateKey === previousFirstDayKey)
    ) {
      const scrollHeightDelta = scrollElement.scrollHeight - previousScrollHeight;
      if (scrollHeightDelta > 0) {
        scrollElement.scrollTop += scrollHeightDelta;
      }
    }

    previousFirstDayKeyRef.current = firstDayKey;
    previousScrollHeightRef.current = scrollElement?.scrollHeight ?? 0;
    updateVirtualRange(scrollElement);
  }, [firstDayKey, listDays, scrollViewportRef, updateVirtualRange]);

  useEffect(() => {
    const selectedDateTime = selectedDate.getTime();
    const scrollElement = scrollViewportRef.current;
    if (lastSelectedDateTimeRef.current === selectedDateTime || !scrollElement || selectedDayIndex < 0) return;

    lastSelectedDateTimeRef.current = selectedDateTime;
    scrollElement.scrollTop = Math.max(0, virtualMetrics.offsets[selectedDayIndex] - SELECTED_DAY_SCROLL_BLOCK_OFFSET_PX);
    updateVirtualRange(scrollElement);
  }, [scrollViewportRef, selectedDate, selectedDayIndex, updateVirtualRange, virtualMetrics]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current != null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      clearEdgeExtendTimer();
    };
  }, [clearEdgeExtendTimer]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-white", className)}>
      <div ref={scrollViewportRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 scrollbar-hidden" onScroll={handleScroll}>
        <div className="mx-auto w-full max-w-[940px]">
          <div className="relative w-full" style={{ height: virtualMetrics.totalHeight }}>
            {renderedDays.map((day, index) => {
              const dayIndex = virtualRange.start + index;

              return (
                <div
                  key={day.dateKey}
                  className="absolute left-0 right-0"
                  style={{
                    contain: "layout paint style",
                    top: virtualMetrics.offsets[dayIndex],
                    height: virtualMetrics.heights[dayIndex],
                  }}
                >
                  <CalendarListDaySection
                    day={day}
                    selectedDayRef={day.isSelected ? (node) => {
                      selectedDayElementRef.current = node;
                    } : undefined}
                    onSelectDate={onSelectDate}
                  />
                </div>
              );
            })}
          </div>

          {listDays.length === 0 ? (
            <EmptyDayCard isMonthEmpty={isMonthEmpty} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

const CalendarListView = memo(CalendarListViewComponent);

CalendarListView.displayName = "CalendarListView";

export { CalendarListView };
