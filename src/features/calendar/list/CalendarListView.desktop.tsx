import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type UIEvent } from "react";
import { addDays, format, getDaysInMonth, isSameDay, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.schedule.list";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarListViewProps = {
  days: Date[];
  events: GoogleCalendarEvent[];
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
  onReachStart?: () => void;
  onReachEnd?: () => void;
  onVisibleMonthChange?: (date: Date) => void;
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

const EMPTY_DAY_LABEL = "予定なし";
const EMPTY_MONTH_LABEL = "この期間の予定はありません";
const SELECTED_DAY_SCROLL_BLOCK: ScrollLogicalPosition = "nearest";
const LIST_SCROLL_EDGE_THRESHOLD_PX = 180;
const LIST_SCROLL_EDGE_RESET_PX = 420;
const LIST_SCROLL_IDLE_DELAY_MS = 120;
const LIST_VISIBLE_MONTH_ANCHOR_PX = 160;
const LIST_DAY_DATA_ATTRIBUTE = "data-calendar-list-day-time";
const LIST_DAY_SELECTOR = `[${LIST_DAY_DATA_ATTRIBUTE}]`;

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

const getListDayTime = (element: HTMLElement | null): number | null => {
  const dayTime = Number(element?.dataset.calendarListDayTime);

  return Number.isFinite(dayTime) ? dayTime : null;
};

const getVisibleMonthAnchorDate = (scrollElement: HTMLDivElement): Date | null => {
  const containerRect = scrollElement.getBoundingClientRect();
  const anchorX = containerRect.left + containerRect.width / 2;
  const anchorY = containerRect.top + Math.min(LIST_VISIBLE_MONTH_ANCHOR_PX, containerRect.height / 2);
  const targetElement = document.elementFromPoint(anchorX, anchorY);
  const anchorSection = targetElement instanceof HTMLElement
    ? targetElement.closest<HTMLElement>(LIST_DAY_SELECTOR)
    : null;
  const fallbackSection = anchorSection ?? scrollElement.querySelector<HTMLElement>(LIST_DAY_SELECTOR);
  const dayTime = getListDayTime(fallbackSection);

  return dayTime == null ? null : new Date(dayTime);
};

const EmptyDayCard = ({ isMonthEmpty }: { isMonthEmpty: boolean }) => (
  <div className="grid min-h-[38px] grid-cols-[54px_26px_minmax(0,1fr)] items-stretch">
    <div className="pt-2.5 text-right text-[12px] font-medium leading-none text-[#b3b3b3]">
      —
    </div>
    <div className="relative flex justify-center">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#dedede]" aria-hidden="true" />
      <span className="relative mt-[8px] h-2 w-2 rounded-full border border-[#dedede] bg-white" aria-hidden="true" />
    </div>
    <div className="flex min-h-[34px] items-center rounded-[10px] border border-dashed border-[#dedede] bg-white px-3 text-[12px] font-semibold text-[#8e8e93]">
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
      className="grid grid-cols-[58px_minmax(0,1fr)] gap-2"
      aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}
      data-calendar-list-day-time={day.date.getTime()}
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

      <div className="space-y-1.5">
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
  className,
}: CalendarListViewProps) => {
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const selectedDayElementRef = useRef<HTMLElement | null>(null);
  const previousFirstDayKeyRef = useRef<string | null>(null);
  const previousScrollHeightRef = useRef(0);
  const lastReachStartKeyRef = useRef<string | null>(null);
  const lastReachEndKeyRef = useRef<string | null>(null);
  const lastSelectedDateTimeRef = useRef<number | null>(null);
  const lastVisibleMonthTimeRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const edgeExtendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollElementRef = useRef<HTMLDivElement | null>(null);
  const pendingEdgeDirectionRef = useRef<"start" | "end" | null>(null);
  const listDays = useMemo(
    () => buildListDays(days, events, selectedDate),
    [days, events, selectedDate],
  );
  const isMonthEmpty = listDays.every((day) => day.events.length === 0);
  const firstDayKey = listDays[0]?.dateKey ?? null;
  const lastDayKey = listDays.at(-1)?.dateKey ?? null;

  const updateVisibleMonth = useCallback((scrollElement: HTMLDivElement | null) => {
    if (!scrollElement || !onVisibleMonthChange) return;

    const anchorDate = getVisibleMonthAnchorDate(scrollElement);
    if (!anchorDate) return;

    const visibleMonth = startOfMonth(anchorDate);
    const visibleMonthTime = visibleMonth.getTime();
    if (lastVisibleMonthTimeRef.current === visibleMonthTime) return;

    lastVisibleMonthTimeRef.current = visibleMonthTime;
    onVisibleMonthChange(visibleMonth);
  }, [onVisibleMonthChange]);

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
  }, [clearEdgeExtendTimer, firstDayKey, lastDayKey, requestEdgeExtension, updateVisibleMonth]);

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
  }, [firstDayKey, listDays]);

  useEffect(() => {
    const selectedDateTime = selectedDate.getTime();
    if (lastSelectedDateTimeRef.current === selectedDateTime) return;

    lastSelectedDateTimeRef.current = selectedDateTime;
    selectedDayElementRef.current?.scrollIntoView({ block: SELECTED_DAY_SCROLL_BLOCK });
  }, [selectedDate]);

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
        <div className="mx-auto flex w-full max-w-[940px] flex-col gap-2">
          {listDays.map((day) => (
            <CalendarListDaySection
              key={day.dateKey}
              day={day}
              selectedDayRef={day.isSelected ? (node) => {
                selectedDayElementRef.current = node;
              } : undefined}
              onSelectDate={onSelectDate}
            />
          ))}

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