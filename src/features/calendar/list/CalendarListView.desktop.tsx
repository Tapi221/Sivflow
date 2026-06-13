import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, format, getDaysInMonth, isSameDay, startOfMonth, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import type { CSSProperties, MutableRefObject } from "react";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { LIST_ALL_DAY_EVENT_ROW_HEIGHT_PX, LIST_DAY_GAP_PX, LIST_EMPTY_DAY_HEIGHT_PX, LIST_EVENT_ROW_GAP_PX, LIST_EVENT_ROW_HEIGHT_PX } from "@/chip/eventchip/EventChip.list.placement";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { getScheduleVirtualRailDate } from "@/features/calendar/grid/ScheduleColumn.shared";
import { useImmediateVirtualScrollRange } from "@/features/scroll/schedule/hooks/useImmediateVirtualScrollRange";
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
type CalendarListVirtualItemBase = {
  key: string;
  day: CalendarListDay;
  dayIndex: number;
  rowHeight: number;
  height: number;
  isFirstDayItem: boolean;
};
type CalendarListEmptyItem = CalendarListVirtualItemBase & {
  kind: "empty";
};
type CalendarListEventItem = CalendarListVirtualItemBase & {
  kind: "event";
  event: GoogleCalendarEvent;
  eventIndex: number;
};
type CalendarListVirtualItem = CalendarListEmptyItem | CalendarListEventItem;
type CalendarListVirtualMetrics = {
  items: CalendarListVirtualItem[];
  offsets: number[];
  firstItemIndexByDateKey: Map<string, number>;
  totalHeight: number;
};
type CalendarListEventIndex = Map<string, GoogleCalendarEvent[]>;
type CalendarListItemRowProps = {
  item: CalendarListVirtualItem;
  showDayHeader: boolean;
  onSelectDate?: (date: Date) => void;
};



const EMPTY_DAY_LABEL = "予定なし";
const SELECTED_OFFSET = 8;
const ANCHOR_OFFSET = 160;
const LOCAL_DAYS = 3650;
const LIST_MATERIALIZE_OVERSCAN_PX = 8_000;
const LIST_MAX_RANGE_UPDATE_GUARD_PX = 2_400;
const DATE_KEY_PART_COUNT = 3;
const LIST_DAY_RAIL_CLASS_NAME =
  "pointer-events-none absolute -bottom-2 left-[67px] top-0 w-px -translate-x-1/2 bg-[#eceff3]";
const LIST_GLOBAL_RAIL_CLASS_NAME =
  "pointer-events-none absolute bottom-0 left-[127px] top-0 w-px -translate-x-1/2 bg-[#eceff3] md:left-[183px]";
const DAY_DATE_NUMBER_CLASS_NAME =
  "flex h-8 w-8 items-center justify-center rounded-full text-[16px] font-bold leading-none tracking-[-0.03em] tabular-nums transition-all duration-150";
const DAY_WEEKDAY_CLASS_NAME =
  "text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]";
const SELECTED_DAY_DATE_NUMBER_CLASS_NAME =
  "border-0 bg-[var(--ds-color-tag-sky-bg)] text-[var(--ds-color-tag-sky-fg)] shadow-none ring-0";
const EMPTY_DAY_ROW_CLASS_NAME =
  "grid h-full min-h-[38px] grid-cols-[54px_26px_minmax(0,1fr)] items-stretch";
const EMPTY_DAY_LINE_CLASS_NAME =
  "absolute -bottom-1.5 left-1/2 top-0 w-px -translate-x-1/2 bg-[#eceff3]";
const EMPTY_DAY_DOT_CLASS_NAME =
  "relative mt-2 h-2 w-2 rounded-full border-2 border-[#dedede] bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]";



const createRail = (selectedDate: Date): ScheduleVirtualRail => ({
  startDate: subDays(startOfMonth(selectedDate), LOCAL_DAYS),
  anchorIndex: LOCAL_DAYS,
  totalDayCount: LOCAL_DAYS * 2 + getDaysInMonth(selectedDate),
});
const getIndexForDate = (rail: ScheduleVirtualRail, date: Date): number =>
  differenceInCalendarDays(date, rail.startDate);
const parseCalendarDateKey = (dateKey: string): Date | null => {
  const parts = dateKey.split("-");
  if (parts.length !== DATE_KEY_PART_COUNT) return null;
  const [year, month, day] = parts.map((part) => Number.parseInt(part, 10));
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};
const getEventRowHeight = (event: GoogleCalendarEvent): number =>
  event.isAllDay ? LIST_ALL_DAY_EVENT_ROW_HEIGHT_PX : LIST_EVENT_ROW_HEIGHT_PX;
const getEventInstanceKey = (
  dateKey: string,
  event: GoogleCalendarEvent,
): string =>
  `${dateKey}:${event.id}:${new Date(event.startsAt).getTime()}:${new Date(
    event.endsAt,
  ).getTime()}`;
const getCalendarListItemAriaLabel = (item: CalendarListVirtualItem): string => {
  const dateLabel = format(item.day.date, "yyyy年M月d日 EEEE", { locale: ja });
  if (item.kind === "empty") return `${dateLabel} ${EMPTY_DAY_LABEL}`;
  return `${dateLabel} ${item.event.title}`;
};
const createItemRowStyle = (height: number): CSSProperties => ({
  height,
});
const buildCalendarListEventIndex = (
  rail: ScheduleVirtualRail,
  totalDayCount: number,
  events: GoogleCalendarEvent[],
): CalendarListEventIndex => {
  const eventsByDateKey: CalendarListEventIndex = new Map();
  events.forEach((event) => {
    getEventDateKeys(event).forEach((dateKey) => {
      const date = parseCalendarDateKey(dateKey);
      if (!date) return;
      const index = getIndexForDate(rail, date);
      if (index < 0 || index >= totalDayCount) return;
      const dayEvents = eventsByDateKey.get(dateKey) ?? [];
      if (!eventsByDateKey.has(dateKey)) {
        eventsByDateKey.set(dateKey, dayEvents);
      }
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
const appendVirtualItem = (
  metrics: CalendarListVirtualMetrics,
  item: CalendarListVirtualItem,
) => {
  metrics.offsets.push(metrics.totalHeight);
  metrics.items.push(item);
  metrics.totalHeight += item.height;
};
const buildCalendarListVirtualMetrics = (
  rail: ScheduleVirtualRail,
  totalDayCount: number,
  eventsByDateKey: CalendarListEventIndex,
  selectedDate: Date,
  dayHeights: Record<string, number> | undefined,
): CalendarListVirtualMetrics => {
  const metrics: CalendarListVirtualMetrics = {
    items: [],
    offsets: [],
    firstItemIndexByDateKey: new Map(),
    totalHeight: 0,
  };
  if (totalDayCount <= 0) return metrics;
  const today = new Date();
  for (let dayIndex = 0; dayIndex < totalDayCount; dayIndex += 1) {
    const date = getScheduleVirtualRailDate(rail, dayIndex);
    if (!date) continue;
    const dateKey = getCalendarDateKey(date);
    const dayEvents = eventsByDateKey.get(dateKey) ?? [];
    const day: CalendarListDay = {
      date,
      dateKey,
      events: dayEvents,
      isSelected: isSameDay(date, selectedDate),
      isToday: isSameDay(date, today),
    };
    const hasNextDay = dayIndex < totalDayCount - 1;
    metrics.firstItemIndexByDateKey.set(dateKey, metrics.items.length);
    if (dayEvents.length === 0) {
      const measuredDayHeight = Math.max(
        LIST_EMPTY_DAY_HEIGHT_PX,
        dayHeights?.[dateKey] ?? LIST_EMPTY_DAY_HEIGHT_PX,
      );
      appendVirtualItem(metrics, {
        kind: "empty",
        key: `${dateKey}:empty`,
        day,
        dayIndex,
        rowHeight: LIST_EMPTY_DAY_HEIGHT_PX,
        height: measuredDayHeight + (hasNextDay ? LIST_DAY_GAP_PX : 0),
        isFirstDayItem: true,
      });
      continue;
    }
    const estimatedDayHeight =
      dayEvents.reduce((total, event) => total + getEventRowHeight(event), 0) +
      Math.max(0, dayEvents.length - 1) * LIST_EVENT_ROW_GAP_PX;
    const measuredDayHeight = Math.max(
      estimatedDayHeight,
      dayHeights?.[dateKey] ?? estimatedDayHeight,
    );
    const extraHeight = measuredDayHeight - estimatedDayHeight;
    dayEvents.forEach((event, eventIndex) => {
      const isLastEvent = eventIndex === dayEvents.length - 1;
      const rowHeight = getEventRowHeight(event);
      const trailingGap = isLastEvent
        ? extraHeight + (hasNextDay ? LIST_DAY_GAP_PX : 0)
        : LIST_EVENT_ROW_GAP_PX;
      appendVirtualItem(metrics, {
        kind: "event",
        key: getEventInstanceKey(dateKey, event),
        day,
        dayIndex,
        event,
        eventIndex,
        rowHeight,
        height: rowHeight + trailingGap,
        isFirstDayItem: eventIndex === 0,
      });
    });
  }
  return metrics;
};
const getItemTop = (
  metrics: CalendarListVirtualMetrics,
  itemIndex: number,
): number => {
  if (itemIndex <= 0) return 0;
  if (itemIndex >= metrics.items.length) return metrics.totalHeight;
  return metrics.offsets[itemIndex] ?? 0;
};
const createVirtualItemStyle = (
  metrics: CalendarListVirtualMetrics,
  itemIndex: number,
  height: number,
): CSSProperties => ({
  contain: "layout style paint",
  contentVisibility: "auto",
  containIntrinsicSize: `${height}px`,
  height,
  top: getItemTop(metrics, itemIndex),
});
const getItemIndexAtOffset = (
  metrics: CalendarListVirtualMetrics,
  offset: number,
): number => {
  if (metrics.items.length === 0) return 0;
  let low = 0;
  let high = metrics.items.length - 1;
  let result = 0;
  const normalizedOffset = Math.max(0, offset);
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const itemTop = getItemTop(metrics, middle);
    if (itemTop <= normalizedOffset) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
};
const getRange = (
  metrics: CalendarListVirtualMetrics,
  scrollTop: number,
  viewportHeight: number,
  overscan: number,
): VirtualRange => {
  if (metrics.items.length === 0) return { start: 0, end: 0 };
  const start = getItemIndexAtOffset(metrics, scrollTop - overscan);
  const end = Math.min(
    metrics.items.length,
    getItemIndexAtOffset(
      metrics,
      scrollTop + viewportHeight + overscan,
    ) + 2,
  );
  return { start, end: Math.max(start, end) };
};
const sameRange = (left: VirtualRange, right: VirtualRange): boolean =>
  left.start === right.start && left.end === right.end;
const getRangeUpdateGuard = (overscan: number): number =>
  Math.min(LIST_MAX_RANGE_UPDATE_GUARD_PX, Math.max(0, overscan / 2));
const shouldRefreshRange = (
  element: HTMLDivElement,
  metrics: CalendarListVirtualMetrics,
  range: VirtualRange,
  overscan: number,
): boolean => {
  if (range.end <= range.start) return true;
  const visibleTop = element.scrollTop;
  const visibleBottom = element.scrollTop + element.clientHeight;
  const guard = getRangeUpdateGuard(overscan);
  return (
    visibleTop < getItemTop(metrics, range.start) + guard ||
    visibleBottom > getItemTop(metrics, range.end) - guard
  );
};
const getSelectedDateScrollTop = (
  metrics: CalendarListVirtualMetrics,
  selectedItemIndex: number,
): number => {
  if (selectedItemIndex < 0 || selectedItemIndex >= metrics.items.length) return 0;
  return Math.max(0, getItemTop(metrics, selectedItemIndex) - SELECTED_OFFSET);
};
const getSelectedDateRange = (
  metrics: CalendarListVirtualMetrics,
  selectedItemIndex: number,
): VirtualRange => {
  const scrollTop = getSelectedDateScrollTop(metrics, selectedItemIndex);
  return getRange(
    metrics,
    scrollTop,
    0,
    LIST_MATERIALIZE_OVERSCAN_PX,
  );
};
const getMonthVisibilityKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}`;
const getDayDateNumberClassName = (day: CalendarListDay): string =>
  cn(
    DAY_DATE_NUMBER_CLASS_NAME,
    day.isSelected
      ? SELECTED_DAY_DATE_NUMBER_CLASS_NAME
      : day.isToday
        ? "text-[#0a84ff]"
        : "text-[#1c1c1e]",
  );



const EmptyDayCard = () => (
  <div className={EMPTY_DAY_ROW_CLASS_NAME}>
    <div className="pt-2.5 text-right text-[12px] font-medium leading-none text-[#b3b3b3]">
      —
    </div>
    <div className="relative flex justify-center">
      <span className={EMPTY_DAY_LINE_CLASS_NAME} aria-hidden="true" />
      <span className={EMPTY_DAY_DOT_CLASS_NAME} aria-hidden="true" />
    </div>
    <div className="flex h-[34px] items-center rounded-[10px] border border-dashed border-[#dedede] bg-white px-3 text-[12px] font-semibold text-[#8e8e93]">
      {EMPTY_DAY_LABEL}
    </div>
  </div>
);
const CalendarListItemRowComponent = ({
  item,
  showDayHeader,
  onSelectDate,
}: CalendarListItemRowProps) => (
  <section
    className="grid grid-cols-[56px_minmax(0,1fr)] gap-1 md:grid-cols-[108px_minmax(0,1fr)] md:gap-2"
    style={createItemRowStyle(item.rowHeight)}
    aria-label={getCalendarListItemAriaLabel(item)}
  >
    {showDayHeader ? (
      <button
        type="button"
        className="group mt-0.5 flex h-8 items-center justify-end gap-1 rounded-[10px] pr-0.5 text-right transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25"
        onClick={() => onSelectDate?.(item.day.date)}
      >
        <span className={getDayDateNumberClassName(item.day)}>
          {format(item.day.date, "d")}
        </span>
        <span className={DAY_WEEKDAY_CLASS_NAME}>
          {format(item.day.date, "EEE", { locale: ja })}
        </span>
      </button>
    ) : (
      <div className="mt-0.5 h-8" aria-hidden="true" />
    )}
    <div className="relative h-full overflow-visible">
      <span className={LIST_DAY_RAIL_CLASS_NAME} aria-hidden="true" />
      <div className="relative h-full overflow-hidden">
        {item.kind === "event" ? (
          <CalendarEventChipList event={item.event} />
        ) : (
          <EmptyDayCard />
        )}
      </div>
    </div>
  </section>
);
const CalendarListViewComponent = ({
  days: _days,
  virtualRail,
  events,
  selectedDate,
  onSelectDate,
  onVisibleMonthChange,
  dayHeights,
  scrollViewportRef: externalRef,
  onScrollTopChange,
  scrollTargetDate,
  scrollTargetToken,
  className,
}: CalendarListViewProps) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = externalRef ?? localRef;
  const resolvedScrollTargetDate = scrollTargetDate ?? selectedDate;
  const rail = useMemo(
    () => virtualRail ?? createRail(resolvedScrollTargetDate),
    [resolvedScrollTargetDate, virtualRail],
  );
  const eventsByDateKey = useMemo(
    () => buildCalendarListEventIndex(rail, rail.totalDayCount, events),
    [events, rail],
  );
  const metrics = useMemo(
    () =>
      buildCalendarListVirtualMetrics(
        rail,
        rail.totalDayCount,
        eventsByDateKey,
        selectedDate,
        dayHeights,
      ),
    [dayHeights, eventsByDateKey, rail, selectedDate],
  );
  const scrollTargetDateKey = useMemo(
    () => getCalendarDateKey(resolvedScrollTargetDate),
    [resolvedScrollTargetDate],
  );
  const scrollTargetItemIndex = useMemo(
    () => metrics.firstItemIndexByDateKey.get(scrollTargetDateKey) ?? -1,
    [metrics.firstItemIndexByDateKey, scrollTargetDateKey],
  );
  const initialRange = useMemo(
    () => getSelectedDateRange(metrics, scrollTargetItemIndex),
    [metrics, scrollTargetItemIndex],
  );
  const [range, setRange] = useState<VirtualRange>(() => initialRange);
  const rangeRef = useRef(range);
  const lastScrollTargetSignatureRef = useRef<string | null>(null);
  const lastVisibleRef = useRef<string | null>(null);
  const visibleItems = useMemo(
    () => metrics.items.slice(range.start, range.end),
    [metrics.items, range.end, range.start],
  );
  const totalHeight = metrics.totalHeight;
  const scrollTargetSignature =
    scrollTargetToken === undefined
      ? scrollTargetDateKey
      : `${scrollTargetToken}`;
  const setRangeIfChanged = useCallback((next: VirtualRange) => {
    if (sameRange(rangeRef.current, next)) return;
    rangeRef.current = next;
    setRange(next);
  }, []);
  const updateRange = useCallback(
    (element: HTMLDivElement | null, force = false) => {
      if (!element) return;
      if (
        !force &&
        !shouldRefreshRange(
          element,
          metrics,
          rangeRef.current,
          LIST_MATERIALIZE_OVERSCAN_PX,
        )
      ) {
        return;
      }
      setRangeIfChanged(
        getRange(
          metrics,
          element.scrollTop,
          element.clientHeight,
          LIST_MATERIALIZE_OVERSCAN_PX,
        ),
      );
    },
    [metrics, setRangeIfChanged],
  );
  const updateVisibleDate = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || !onVisibleMonthChange) return;
      const index = getItemIndexAtOffset(
        metrics,
        element.scrollTop + Math.min(ANCHOR_OFFSET, element.clientHeight / 2),
      );
      const date = metrics.items[index]?.day.date;
      if (!date) return;
      const key = getMonthVisibilityKey(date);
      if (lastVisibleRef.current === key) return;
      lastVisibleRef.current = key;
      onVisibleMonthChange(date);
    },
    [metrics, onVisibleMonthChange],
  );
  const handleDeferredScroll = useCallback(
    (element: HTMLDivElement) => {
      updateVisibleDate(element);
      onScrollTopChange?.(element.scrollTop);
    },
    [onScrollTopChange, updateVisibleDate],
  );
  const { handleScrollElement } =
    useImmediateVirtualScrollRange<HTMLDivElement>({
      updateRange,
      onDeferredScroll: handleDeferredScroll,
    });
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (
      !element ||
      lastScrollTargetSignatureRef.current === scrollTargetSignature ||
      scrollTargetItemIndex < 0 ||
      scrollTargetItemIndex >= metrics.items.length
    ) {
      return;
    }
    lastScrollTargetSignatureRef.current = scrollTargetSignature;
    element.scrollTop = getSelectedDateScrollTop(
      metrics,
      scrollTargetItemIndex,
    );
    updateRange(element, true);
  }, [
    metrics,
    scrollRef,
    scrollTargetItemIndex,
    scrollTargetSignature,
    updateRange,
  ]);
  useLayoutEffect(() => {
    updateRange(scrollRef.current, true);
  }, [scrollRef, updateRange]);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const handleScroll = () => {
      handleScrollElement(element);
    };
    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [handleScrollElement, scrollRef]);
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-white",
        className,
      )}
    >
      <div
        ref={scrollRef}
        className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-2 pb-6 pt-2 md:px-4"
      >
        <div className="mx-auto w-full max-w-[940px]">
          <div className="relative w-full" style={{ height: totalHeight }}>
            <span className={LIST_GLOBAL_RAIL_CLASS_NAME} aria-hidden="true" />
            {visibleItems.map((item, offset) => {
              const itemIndex = range.start + offset;
              const previousVisibleItem = visibleItems[offset - 1];
              const showDayHeader =
                item.isFirstDayItem ||
                previousVisibleItem?.day.dateKey !== item.day.dateKey;
              return (
                <div
                  key={item.key}
                  className="absolute left-0 right-0 top-0"
                  style={createVirtualItemStyle(
                    metrics,
                    itemIndex,
                    item.height,
                  )}
                >
                  <CalendarListItemRow
                    item={item}
                    showDayHeader={showDayHeader}
                    onSelectDate={onSelectDate}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};



const CalendarListItemRow = memo(CalendarListItemRowComponent);
CalendarListItemRow.displayName = "CalendarListItemRow";
const CalendarListView = memo(CalendarListViewComponent);
CalendarListView.displayName = "CalendarListView";

export { CalendarListView };
