import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { addDays, differenceInMinutes, format, isAfter, isBefore, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { areListVirtualRangesEqual, buildListPlacementDays, buildListVirtualMetrics, getEventInstanceKey, getListVirtualRange, getListVisibleDate, LIST_DAY_GAP_PX, LIST_DAY_SECTION_MIN_HEIGHT_PX, LIST_EMPTY_DAY_HEIGHT_PX, type CalendarListPlacementDay, type CalendarListVirtualRange } from "@/chip/eventchip/EventChip.list.placement";
import { getCalendarDateKey } from "@/features/calendar/calendarEventRange";
import type { AppCalendarItem, GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarListPieChartSplitViewProps = {
  days: Date[];
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

type DailyPieSlice = {
  id: string;
  label: string;
  color: string;
  borderColor: string;
  labelColor: string;
  minutes: number;
  eventCount: number;
  percentage: number;
  startMinute: number;
  endMinute: number;
  isGap: boolean;
};

type EventSegmentMeta = {
  id: string;
  label: string;
  color: string;
  borderColor: string;
  labelColor: string;
};

type CalendarSplitDay = CalendarListPlacementDay & {
  slices: DailyPieSlice[];
};

type DailyClockPieProps = {
  slices: DailyPieSlice[];
};

type CalendarSplitDaySectionProps = {
  day: CalendarSplitDay;
  height: number;
  onSelectDate?: (date: Date) => void;
};

const EMPTY_DAY_LABEL = "予定なし";
const EMPTY_MONTH_LABEL = "この期間の予定はありません";
const DEFAULT_SEGMENT_COLOR = "#8e8e93";
const GAP_SEGMENT_COLOR = "#f7f7f8";
const GAP_SEGMENT_BORDER_COLOR = "rgba(255,255,255,0.7)";
const GAP_SEGMENT_LABEL_COLOR = "#8e8e93";
const FULL_DAY_MINUTES = 24 * 60;
const CHART_CENTER = 100;
const CHART_RADIUS = 82;
const CHART_LABEL_RADIUS = CHART_RADIUS * 0.58;
const CHART_CLOCK_LABEL_RADIUS = CHART_RADIUS + 11;
const CHART_EVENT_BORDER_STROKE_WIDTH = 3;
const CLOCK_HOURS = Array.from({ length: 25 }, (_, index) => index);
const SPLIT_CHART_CONTAINER_MAX_SIZE_PX = LIST_DAY_SECTION_MIN_HEIGHT_PX - 30;
const SPLIT_SCROLL_EDGE_THRESHOLD_PX = 220;
const SPLIT_SCROLL_EDGE_RESET_PX = 520;
const SPLIT_SCROLL_IDLE_DELAY_MS = 120;
const SPLIT_VISIBLE_DATE_ANCHOR_PX = 160;
const SELECTED_DAY_SCROLL_BLOCK_OFFSET_PX = 8;
const CHART_CONTAINER_STYLE = { width: `min(100%, 72vh, ${SPLIT_CHART_CONTAINER_MAX_SIZE_PX}px)` };

const formatDuration = (minutes: number): string => {
  const normalizedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(normalizedMinutes / 60);
  const restMinutes = normalizedMinutes % 60;

  if (hours <= 0) return `${restMinutes}m`;

  return `${hours}h${restMinutes.toString().padStart(2, "0")}m`;
};

const createCalendarLabelMap = (googleAccounts: GoogleAccountDisplay[]) => {
  const labelByCalendarId = new Map<string, string>();

  googleAccounts.forEach((account) => {
    account.calendars.forEach((calendar) => {
      labelByCalendarId.set(calendar.id, calendar.summaryOverride ?? calendar.summary);
    });
  });

  return labelByCalendarId;
};

const createEventChipColorMeta = (accentColor: string) => {
  const tokens = generateColorTokens(accentColor || DEFAULT_SEGMENT_COLOR);

  return {
    color: tokens.bg,
    borderColor: tokens.border,
    labelColor: tokens.text,
  };
};

const polarToCartesian = (minute: number, radius: number) => {
  const angle = (minute / FULL_DAY_MINUTES) * 360 - 90;
  const angleInRadians = (angle * Math.PI) / 180;

  return {
    x: CHART_CENTER + radius * Math.cos(angleInRadians),
    y: CHART_CENTER + radius * Math.sin(angleInRadians),
  };
};

const buildWedgePath = (startMinute: number, endMinute: number): string => {
  const start = polarToCartesian(startMinute, CHART_RADIUS);
  const end = polarToCartesian(endMinute, CHART_RADIUS);
  const largeArcFlag = endMinute - startMinute > FULL_DAY_MINUTES / 2 ? 1 : 0;

  return [`M ${CHART_CENTER} ${CHART_CENTER}`, `L ${start.x} ${start.y}`, `A ${CHART_RADIUS} ${CHART_RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`, "Z"].join(" ");
};

const buildArcPath = (startMinute: number, endMinute: number, radius: number): string => {
  const start = polarToCartesian(startMinute, radius);
  const end = polarToCartesian(endMinute, radius);
  const largeArcFlag = endMinute - startMinute > FULL_DAY_MINUTES / 2 ? 1 : 0;

  return [`M ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`].join(" ");
};

const getChartOverlayStyle = (minute: number, radius: number) => {
  const point = polarToCartesian(minute, radius);

  return {
    left: `${(point.x / (CHART_CENTER * 2)) * 100}%`,
    top: `${(point.y / (CHART_CENTER * 2)) * 100}%`,
  };
};

const getClockLabelOverlayStyle = (hour: number) => getChartOverlayStyle(hour * 60, hour === 24 ? CHART_CLOCK_LABEL_RADIUS + 7 : CHART_CLOCK_LABEL_RADIUS);

const resolveEventSegmentMeta = (
  event: GoogleCalendarEvent,
  appProjects: AppCalendarItem[],
  calendarLabelById: Map<string, string>,
): EventSegmentMeta => {
  const colorMeta = createEventChipColorMeta(event.accentColor);
  const project = appProjects.find((item) => item.id === event.projectId || item.label === event.projectId);

  if (project) {
    return {
      id: `project:${project.id}`,
      label: project.label,
      ...colorMeta,
    };
  }

  if (event.projectId) {
    return {
      id: `project:${event.projectId}`,
      label: event.projectId,
      ...colorMeta,
    };
  }

  const calendarLabel = calendarLabelById.get(event.calendarId);

  return {
    id: `calendar:${event.calendarId}`,
    label: calendarLabel ?? event.title,
    ...colorMeta,
  };
};

const buildDailyPieSlices = (
  date: Date,
  events: GoogleCalendarEvent[],
  appProjects: AppCalendarItem[],
  calendarLabelById: Map<string, string>,
): DailyPieSlice[] => {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  const timedEvents = events.flatMap((event) => {
    if (event.isAllDay) return [];
    if (!isBefore(event.startsAt, dayEnd) || !isAfter(event.endsAt, dayStart)) return [];

    const startsAt = isBefore(event.startsAt, dayStart) ? dayStart : event.startsAt;
    const endsAt = isAfter(event.endsAt, dayEnd) ? dayEnd : event.endsAt;
    const startMinute = Math.max(0, differenceInMinutes(startsAt, dayStart));
    const endMinute = Math.min(FULL_DAY_MINUTES, differenceInMinutes(endsAt, dayStart));

    if (endMinute <= startMinute) return [];

    return [
      {
        ...resolveEventSegmentMeta(event, appProjects, calendarLabelById),
        sourceId: event.id,
        startMinute,
        endMinute,
      },
    ];
  }).sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

  const slices: DailyPieSlice[] = [];
  let cursor = 0;

  timedEvents.forEach((event) => {
    const startMinute = Math.max(cursor, event.startMinute);
    const endMinute = Math.max(startMinute, event.endMinute);

    if (startMinute > cursor) {
      slices.push({
        id: `gap:${getCalendarDateKey(date)}:${cursor}:${startMinute}`,
        label: "未予定",
        color: GAP_SEGMENT_COLOR,
        borderColor: GAP_SEGMENT_BORDER_COLOR,
        labelColor: GAP_SEGMENT_LABEL_COLOR,
        minutes: startMinute - cursor,
        eventCount: 0,
        percentage: 0,
        startMinute: cursor,
        endMinute: startMinute,
        isGap: true,
      });
    }

    if (endMinute > startMinute) {
      slices.push({
        id: `${event.id}:${event.sourceId}:${getCalendarDateKey(date)}:${startMinute}:${endMinute}`,
        label: event.label,
        color: event.color,
        borderColor: event.borderColor,
        labelColor: event.labelColor,
        minutes: endMinute - startMinute,
        eventCount: 1,
        percentage: 0,
        startMinute,
        endMinute,
        isGap: false,
      });
    }

    cursor = Math.max(cursor, endMinute);
  });

  if (cursor < FULL_DAY_MINUTES) {
    slices.push({
      id: `gap:${getCalendarDateKey(date)}:${cursor}:${FULL_DAY_MINUTES}`,
      label: "未予定",
      color: GAP_SEGMENT_COLOR,
      borderColor: GAP_SEGMENT_BORDER_COLOR,
      labelColor: GAP_SEGMENT_LABEL_COLOR,
      minutes: FULL_DAY_MINUTES - cursor,
      eventCount: 0,
      percentage: 0,
      startMinute: cursor,
      endMinute: FULL_DAY_MINUTES,
      isGap: true,
    });
  }

  const scheduledMinutes = slices.reduce((sum, slice) => slice.isGap ? sum : sum + slice.minutes, 0);

  return slices.map((slice) => ({
    ...slice,
    percentage: !slice.isGap && scheduledMinutes > 0 ? Math.round((slice.minutes / scheduledMinutes) * 100) : 0,
  }));
};

const buildSplitDays = (
  days: Date[],
  events: GoogleCalendarEvent[],
  selectedDate: Date,
  appProjects: AppCalendarItem[],
  googleAccounts: GoogleAccountDisplay[],
): CalendarSplitDay[] => {
  const calendarLabelById = createCalendarLabelMap(googleAccounts);
  const listDays = buildListPlacementDays({
    days,
    events,
    selectedDate,
  });

  return listDays.map((day) => ({
    ...day,
    slices: buildDailyPieSlices(day.date, events, appProjects, calendarLabelById),
  }));
};

const truncateChartLabel = (label: string) => {
  if (label.length <= 6) return label;

  return `${label.slice(0, 5)}…`;
};

const EmptyDayCard = ({ isMonthEmpty }: { isMonthEmpty: boolean }) => (
  <div className="grid grid-cols-[54px_26px_minmax(0,1fr)] items-stretch" style={{ height: LIST_EMPTY_DAY_HEIGHT_PX }}>
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

const DailyClockPieComponent = ({ slices }: DailyClockPieProps) => {
  const visibleSlices = slices.filter((slice) => slice.minutes > 0);
  const hasTimedSlices = visibleSlices.some((slice) => !slice.isGap);

  return (
    <div className="flex h-full w-full min-w-0 items-center justify-center">
      <div className="relative aspect-square min-w-0" style={CHART_CONTAINER_STYLE}>
        {hasTimedSlices ? (
          <>
            <svg viewBox="0 0 200 200" role="img" aria-label="予定の円グラフ" className="h-full w-full overflow-visible">
              {visibleSlices.map((slice) => (
                slice.endMinute - slice.startMinute >= FULL_DAY_MINUTES ? (
                  <circle key={slice.id} cx={CHART_CENTER} cy={CHART_CENTER} r={CHART_RADIUS} fill={slice.color}>
                    <title>
                      {slice.label}: {formatDuration(slice.minutes)}
                    </title>
                  </circle>
                ) : (
                  <path key={slice.id} d={buildWedgePath(slice.startMinute, slice.endMinute)} fill={slice.color}>
                    <title>
                      {slice.label}: {formatDuration(slice.minutes)}
                    </title>
                  </path>
                )
              ))}

              {visibleSlices.filter((slice) => !slice.isGap).map((slice) => (
                slice.endMinute - slice.startMinute >= FULL_DAY_MINUTES ? (
                  <circle key={`accent:${slice.id}`} cx={CHART_CENTER} cy={CHART_CENTER} r={CHART_RADIUS} fill="none" stroke={slice.borderColor} strokeWidth={CHART_EVENT_BORDER_STROKE_WIDTH} vectorEffect="non-scaling-stroke" />
                ) : (
                  <path key={`accent:${slice.id}`} d={buildArcPath(slice.startMinute, slice.endMinute, CHART_RADIUS)} fill="none" stroke={slice.borderColor} strokeWidth={CHART_EVENT_BORDER_STROKE_WIDTH} strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
                )
              ))}

              {CLOCK_HOURS.map((hour) => {
                const minute = hour * 60;
                const inner = polarToCartesian(minute, CHART_RADIUS - 5);
                const outer = polarToCartesian(minute, CHART_RADIUS + 2);

                return (
                  <g key={hour}>
                    <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
                  </g>
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 overflow-visible">
              {CLOCK_HOURS.map((hour) => (
                <span key={hour} className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-medium leading-none tabular-nums text-[rgba(60,60,67,0.62)]" style={getClockLabelOverlayStyle(hour)}>
                  {hour}
                </span>
              ))}

              {visibleSlices.filter((slice) => !slice.isGap && slice.minutes >= 30).map((slice) => {
                const labelMinute = (slice.startMinute + slice.endMinute) / 2;

                return (
                  <span key={`label:${slice.id}`} className="absolute -translate-x-1/2 -translate-y-1/2 text-center text-[12px] font-medium leading-none tabular-nums text-[rgba(60,60,67,0.62)]" style={getChartOverlayStyle(labelMinute, CHART_LABEL_RADIUS)}>
                    <span className="block max-w-[5.5em] truncate">{truncateChartLabel(slice.label)}</span>
                    <span className="block">{formatDuration(slice.minutes)}</span>
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-full border border-dashed border-[#dedede] text-center">
            <div>
              <p className="text-[13px] font-semibold text-[#8e8e93]">時間指定なし</p>
              <p className="mt-1 text-[11px] font-medium text-[#b3b3b3]">終日は集計外</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CalendarSplitDaySectionComponent = ({
  day,
  height,
  onSelectDate,
}: CalendarSplitDaySectionProps) => {
  return (
    <section className="grid h-full grid-cols-2" style={{ height }} aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}>
      <div className="min-h-0 min-w-0 border-r border-[#eeeeee] px-4">
        <div className="mx-auto w-full max-w-[940px]">
          <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-2">
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
          </div>
        </div>
      </div>

      <div className="min-h-0 min-w-0 px-4">
        <div className="mx-auto h-full w-full max-w-[940px]">
          <div className="grid h-full grid-cols-[58px_minmax(0,1fr)] gap-2">
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

            <div className="min-h-0 min-w-0">
              <DailyClockPie slices={day.slices} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CalendarListPieChartSplitViewComponent = ({
  days,
  selectedDate,
  events,
  appProjects,
  googleAccounts,
  onSelectDate,
  onReachStart,
  onReachEnd,
  onVisibleMonthChange,
  onVisibleDateChange,
  className,
}: CalendarListPieChartSplitViewProps) => {
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const previousFirstDayKeyRef = useRef<string | null>(null);
  const previousScrollHeightRef = useRef(0);
  const lastReachStartKeyRef = useRef<string | null>(null);
  const lastReachEndKeyRef = useRef<string | null>(null);
  const lastSelectedDateKeyRef = useRef<string | null>(null);
  const lastVisibleDateKeyRef = useRef<string | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const edgeExtendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollElementRef = useRef<HTMLDivElement | null>(null);
  const pendingEdgeDirectionRef = useRef<"start" | "end" | null>(null);
  const [virtualRange, setVirtualRange] = useState<CalendarListVirtualRange>({ start: 0, end: 0 });
  const splitDays = useMemo(
    () => buildSplitDays(days, events, selectedDate, appProjects, googleAccounts),
    [appProjects, days, events, googleAccounts, selectedDate],
  );
  const virtualMetrics = useMemo(() => buildListVirtualMetrics(splitDays), [splitDays]);
  const isMonthEmpty = splitDays.every((day) => day.events.length === 0);
  const firstDayKey = splitDays[0]?.dateKey ?? null;
  const lastDayKey = splitDays.at(-1)?.dateKey ?? null;
  const renderedDays = splitDays.slice(virtualRange.start, virtualRange.end);
  const selectedDateKey = getCalendarDateKey(selectedDate);
  const selectedDayIndex = splitDays.findIndex((day) => day.dateKey === selectedDateKey);

  const updateVirtualRange = useCallback((scrollElement: HTMLDivElement | null) => {
    const nextRange = scrollElement
      ? getListVirtualRange(virtualMetrics, scrollElement.scrollTop, scrollElement.clientHeight)
      : getListVirtualRange(virtualMetrics, 0, 0);

    setVirtualRange((currentRange) => areListVirtualRangesEqual(currentRange, nextRange) ? currentRange : nextRange);
  }, [virtualMetrics]);

  const updateVisibleDate = useCallback((scrollElement: HTMLDivElement | null) => {
    if (!scrollElement) return;

    const anchorOffset = scrollElement.scrollTop + Math.min(SPLIT_VISIBLE_DATE_ANCHOR_PX, scrollElement.clientHeight / 2);
    const visibleDate = getListVisibleDate(splitDays, virtualMetrics, anchorOffset);
    if (!visibleDate) return;

    const visibleDateKey = getCalendarDateKey(visibleDate);
    if (lastVisibleDateKeyRef.current === visibleDateKey) return;

    lastVisibleDateKeyRef.current = visibleDateKey;
    onVisibleMonthChange?.(visibleDate);
    onVisibleDateChange?.(visibleDate);
  }, [onVisibleDateChange, onVisibleMonthChange, splitDays, virtualMetrics]);

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
    }, SPLIT_SCROLL_IDLE_DELAY_MS);
  }, [clearEdgeExtendTimer, onReachEnd, onReachStart]);

  const processScroll = useCallback((scrollElement: HTMLDivElement) => {
    const remainingScrollBottom = scrollElement.scrollHeight - scrollElement.clientHeight - scrollElement.scrollTop;

    updateVirtualRange(scrollElement);
    updateVisibleDate(scrollElement);

    if (scrollElement.scrollTop <= SPLIT_SCROLL_EDGE_THRESHOLD_PX) {
      if (firstDayKey && lastReachStartKeyRef.current !== firstDayKey) {
        lastReachStartKeyRef.current = firstDayKey;
        requestEdgeExtension("start");
      }
    } else if (scrollElement.scrollTop >= SPLIT_SCROLL_EDGE_RESET_PX) {
      lastReachStartKeyRef.current = null;
      if (pendingEdgeDirectionRef.current === "start") {
        pendingEdgeDirectionRef.current = null;
        clearEdgeExtendTimer();
      }
    }

    if (remainingScrollBottom <= SPLIT_SCROLL_EDGE_THRESHOLD_PX) {
      if (lastDayKey && lastReachEndKeyRef.current !== lastDayKey) {
        lastReachEndKeyRef.current = lastDayKey;
        requestEdgeExtension("end");
      }
    } else if (remainingScrollBottom >= SPLIT_SCROLL_EDGE_RESET_PX) {
      lastReachEndKeyRef.current = null;
      if (pendingEdgeDirectionRef.current === "end") {
        pendingEdgeDirectionRef.current = null;
        clearEdgeExtendTimer();
      }
    }
  }, [clearEdgeExtendTimer, firstDayKey, lastDayKey, requestEdgeExtension, updateVirtualRange, updateVisibleDate]);

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
  }, [requestScrollProcessing, updateVirtualRange]);

  useLayoutEffect(() => {
    const scrollElement = scrollViewportRef.current;
    const previousFirstDayKey = previousFirstDayKeyRef.current;
    const previousScrollHeight = previousScrollHeightRef.current;

    if (
      scrollElement &&
      previousFirstDayKey &&
      firstDayKey &&
      previousFirstDayKey !== firstDayKey &&
      splitDays.some((day) => day.dateKey === previousFirstDayKey)
    ) {
      const scrollHeightDelta = scrollElement.scrollHeight - previousScrollHeight;
      if (scrollHeightDelta > 0) {
        scrollElement.scrollTop += scrollHeightDelta;
      }
    }

    previousFirstDayKeyRef.current = firstDayKey;
    previousScrollHeightRef.current = scrollElement?.scrollHeight ?? 0;
    updateVirtualRange(scrollElement);
  }, [firstDayKey, splitDays, updateVirtualRange]);

  useEffect(() => {
    const scrollElement = scrollViewportRef.current;
    if (lastSelectedDateKeyRef.current === selectedDateKey || !scrollElement || selectedDayIndex < 0) return;

    lastSelectedDateKeyRef.current = selectedDateKey;
    scrollElement.scrollTop = Math.max(0, virtualMetrics.offsets[selectedDayIndex] - SELECTED_DAY_SCROLL_BLOCK_OFFSET_PX);
    updateVirtualRange(scrollElement);
  }, [selectedDateKey, selectedDayIndex, updateVirtualRange, virtualMetrics]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current != null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      clearEdgeExtendTimer();
    };
  }, [clearEdgeExtendTimer]);

  return (
    <div className={cn("ml-4 mr-4 flex min-h-0 flex-1 overflow-hidden bg-white text-[#1c1c1e]", className)}>
      <div ref={scrollViewportRef} className="min-h-0 flex-1 overflow-y-auto pb-6 pt-2 scrollbar-hidden" onScroll={handleScroll}>
        <div className="relative w-full" style={{ height: virtualMetrics.totalHeight }}>
          {renderedDays.map((day, index) => {
            const dayIndex = virtualRange.start + index;
            const sectionHeight = Math.max(0, virtualMetrics.heights[dayIndex] - (dayIndex < splitDays.length - 1 ? LIST_DAY_GAP_PX : 0));

            return (
              <div
                key={day.dateKey}
                className="absolute left-0 right-0"
                style={{ contain: "layout paint style", top: virtualMetrics.offsets[dayIndex], height: virtualMetrics.heights[dayIndex] }}
              >
                <CalendarSplitDaySection
                  day={day}
                  height={sectionHeight}
                  onSelectDate={onSelectDate}
                />
              </div>
            );
          })}
        </div>

        {splitDays.length === 0 ? (
          <div className="px-4">
            <EmptyDayCard isMonthEmpty={isMonthEmpty} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const DailyClockPie = memo(DailyClockPieComponent);

DailyClockPie.displayName = "DailyClockPie";

const CalendarSplitDaySection = memo(CalendarSplitDaySectionComponent);

CalendarSplitDaySection.displayName = "CalendarSplitDaySection";

const CalendarListPieChartSplitView = memo(CalendarListPieChartSplitViewComponent);

CalendarListPieChartSplitView.displayName = "CalendarListPieChartSplitView";

export { CalendarListPieChartSplitView };
