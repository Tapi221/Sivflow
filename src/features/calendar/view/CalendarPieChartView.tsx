import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { addDays, differenceInMinutes, format, isAfter, isBefore, isSameDay, startOfDay, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import type { AppCalendarItem, GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarPieChartViewProps = {
  days: Date[];
  selectedDate: Date;
  events: GoogleCalendarEvent[];
  appProjects: AppCalendarItem[];
  googleAccounts: GoogleAccountDisplay[];
  onSelectDate?: (date: Date) => void;
  onReachStart?: () => void;
  onReachEnd?: () => void;
  onVisibleDateChange?: (date: Date) => void;
  className?: string;
};

type CalendarPieChartDay = {
  date: Date;
  dateKey: string;
  slices: DailyPieSlice[];
  scheduledMinutes: number;
  eventCount: number;
  isSelected: boolean;
  isToday: boolean;
};

type CalendarPieChartDayCardProps = {
  day: CalendarPieChartDay;
  selectedDayRef?: (node: HTMLElement | null) => void;
  onSelectDate?: (date: Date) => void;
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

type DailyClockPieProps = {
  slices: DailyPieSlice[];
};

type EventSegmentMeta = {
  id: string;
  label: string;
  color: string;
  borderColor: string;
  labelColor: string;
};

type PieChartVirtualMetrics = {
  heights: number[];
  offsets: number[];
  totalHeight: number;
};

type PieChartVirtualRange = {
  start: number;
  end: number;
};

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
const CLOCK_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
const PIE_CHART_DAY_CARD_HEIGHT_PX = 520;
const PIE_CHART_DAY_GAP_PX = 18;
const PIE_CHART_SCROLL_EDGE_THRESHOLD_PX = 220;
const PIE_CHART_SCROLL_EDGE_RESET_PX = 520;
const PIE_CHART_SCROLL_IDLE_DELAY_MS = 120;
const PIE_CHART_VISIBLE_DATE_ANCHOR_PX = 180;
const PIE_CHART_VIRTUAL_OVERSCAN_PX = 1100;
const SELECTED_DAY_SCROLL_BLOCK_OFFSET_PX = 16;

const formatDuration = (minutes: number): string => {
  const normalizedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(normalizedMinutes / 60);
  const restMinutes = normalizedMinutes % 60;

  if (hours <= 0) return `${restMinutes}m`;

  return `${hours}h${restMinutes.toString().padStart(2, "0")}m`;
};

const getDateKey = (date: Date): string => format(date, "yyyy-MM-dd");

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
        id: `gap:${getDateKey(date)}:${cursor}:${startMinute}`,
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
        id: `${event.id}:${event.sourceId}:${getDateKey(date)}:${startMinute}:${endMinute}`,
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
      id: `gap:${getDateKey(date)}:${cursor}:${FULL_DAY_MINUTES}`,
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

const buildPieChartDays = (
  days: Date[],
  selectedDate: Date,
  events: GoogleCalendarEvent[],
  appProjects: AppCalendarItem[],
  googleAccounts: GoogleAccountDisplay[],
): CalendarPieChartDay[] => {
  const today = new Date();
  const calendarLabelById = createCalendarLabelMap(googleAccounts);

  return days.map((date) => {
    const slices = buildDailyPieSlices(date, events, appProjects, calendarLabelById);

    return {
      date,
      dateKey: getDateKey(date),
      slices,
      scheduledMinutes: slices.reduce((sum, slice) => slice.isGap ? sum : sum + slice.minutes, 0),
      eventCount: slices.reduce((sum, slice) => slice.isGap ? sum : sum + slice.eventCount, 0),
      isSelected: isSameDay(date, selectedDate),
      isToday: isSameDay(date, today),
    };
  });
};

const buildVirtualMetrics = (days: CalendarPieChartDay[]): PieChartVirtualMetrics => {
  let totalHeight = 0;
  const offsets: number[] = [];
  const heights = days.map((_, index) => {
    const height = PIE_CHART_DAY_CARD_HEIGHT_PX + (index < days.length - 1 ? PIE_CHART_DAY_GAP_PX : 0);

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
  metrics: PieChartVirtualMetrics,
  scrollTop: number,
  viewportHeight: number,
): PieChartVirtualRange => {
  if (metrics.heights.length === 0) return { start: 0, end: 0 };

  const rangeStartOffset = Math.max(0, scrollTop - PIE_CHART_VIRTUAL_OVERSCAN_PX);
  const rangeEndOffset = scrollTop + viewportHeight + PIE_CHART_VIRTUAL_OVERSCAN_PX;
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
  left: PieChartVirtualRange,
  right: PieChartVirtualRange,
): boolean => left.start === right.start && left.end === right.end;

const getVisibleDate = (
  days: CalendarPieChartDay[],
  metrics: PieChartVirtualMetrics,
  targetOffset: number,
): Date | null => {
  const index = findVirtualIndex(metrics.offsets, targetOffset);

  return days[index]?.date ?? null;
};

const truncateChartLabel = (label: string) => {
  if (label.length <= 6) return label;

  return `${label.slice(0, 5)}…`;
};

const DailyClockPieComponent = ({ slices }: DailyClockPieProps) => {
  const visibleSlices = slices.filter((slice) => slice.minutes > 0);
  const hasTimedSlices = visibleSlices.some((slice) => !slice.isGap);

  return (
    <div className="flex h-full w-full min-w-0 items-center justify-center">
      <div className="relative aspect-square w-[min(100%,350px)] min-w-0">
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
                <span key={hour} className="absolute -translate-x-1/2 -translate-y-1/2 text-[clamp(11px,2.1vw,16px)] font-medium leading-none text-[#8e8e93]" style={getChartOverlayStyle(hour * 60, CHART_CLOCK_LABEL_RADIUS)}>
                  {hour}
                </span>
              ))}

              {visibleSlices.filter((slice) => !slice.isGap && slice.minutes >= 30).map((slice) => {
                const labelMinute = (slice.startMinute + slice.endMinute) / 2;

                return (
                  <span key={`label:${slice.id}`} className="absolute -translate-x-1/2 -translate-y-1/2 text-center text-[clamp(9px,1.75vw,13px)] font-semibold leading-[1.05] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]" style={{ ...getChartOverlayStyle(labelMinute, CHART_LABEL_RADIUS), color: slice.labelColor }}>
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

const CalendarPieChartDayCardComponent = ({
  day,
  selectedDayRef,
  onSelectDate,
}: CalendarPieChartDayCardProps) => {
  return (
    <section
      ref={day.isSelected ? selectedDayRef : undefined}
      className={cn(
        "flex h-[520px] flex-col rounded-[28px] border bg-white px-5 pb-6 pt-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition",
        day.isSelected ? "border-[#0a84ff]/35 ring-4 ring-[#0a84ff]/10" : "border-[#eeeeee]",
      )}
      aria-label={format(day.date, "yyyy年M月d日 EEEE", { locale: ja })}
    >
      <div className="flex shrink-0 items-start justify-between gap-4">
        <button
          type="button"
          className="min-w-0 rounded-[16px] text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25"
          onClick={() => onSelectDate?.(day.date)}
        >
          <div className="flex items-baseline gap-2">
            <span className={cn("text-[28px] font-bold leading-none tracking-[-0.04em]", day.isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]")}>{format(day.date, "d")}</span>
            <span className="text-[13px] font-semibold text-[rgba(60,60,67,0.58)]">{format(day.date, "EEE", { locale: ja })}</span>
            {day.isToday ? <span className="rounded-full bg-[#0a84ff]/10 px-2 py-0.5 text-[11px] font-bold text-[#0a84ff]">今日</span> : null}
          </div>
          <p className="mt-1 text-[12px] font-medium text-[#8e8e93]">{format(day.date, "yyyy年M月d日", { locale: ja })}</p>
        </button>

        <div className="shrink-0 text-right">
          <p className="text-[12px] font-semibold text-[#8e8e93]">予定時間</p>
          <p className="mt-1 text-[18px] font-bold tracking-[-0.03em] text-[#1c1c1e]">{formatDuration(day.scheduledMinutes)}</p>
          <p className="mt-0.5 text-[11px] font-medium text-[#b3b3b3]">{day.eventCount}件</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-2 py-5">
        <DailyClockPie slices={day.slices} />
      </div>
    </section>
  );
};

const CalendarPieChartViewComponent = ({
  days,
  selectedDate,
  events,
  appProjects,
  googleAccounts,
  onSelectDate,
  onReachStart,
  onReachEnd,
  onVisibleDateChange,
  className,
}: CalendarPieChartViewProps) => {
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const selectedDayElementRef = useRef<HTMLElement | null>(null);
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
  const [virtualRange, setVirtualRange] = useState<PieChartVirtualRange>({ start: 0, end: 0 });
  const pieChartDays = useMemo(
    () => buildPieChartDays(days, selectedDate, events, appProjects, googleAccounts),
    [appProjects, days, events, googleAccounts, selectedDate],
  );
  const virtualMetrics = useMemo(() => buildVirtualMetrics(pieChartDays), [pieChartDays]);
  const firstDayKey = pieChartDays[0]?.dateKey ?? null;
  const lastDayKey = pieChartDays.at(-1)?.dateKey ?? null;
  const renderedDays = pieChartDays.slice(virtualRange.start, virtualRange.end);
  const selectedDateKey = getDateKey(selectedDate);
  const selectedDayIndex = pieChartDays.findIndex((day) => day.dateKey === selectedDateKey);

  const updateVirtualRange = useCallback((scrollElement: HTMLDivElement | null) => {
    const nextRange = scrollElement
      ? getVirtualRange(virtualMetrics, scrollElement.scrollTop, scrollElement.clientHeight)
      : getVirtualRange(virtualMetrics, 0, 0);

    setVirtualRange((currentRange) => areVirtualRangesEqual(currentRange, nextRange) ? currentRange : nextRange);
  }, [virtualMetrics]);

  const updateVisibleDate = useCallback((scrollElement: HTMLDivElement | null) => {
    if (!scrollElement || !onVisibleDateChange) return;

    const anchorOffset = scrollElement.scrollTop + Math.min(PIE_CHART_VISIBLE_DATE_ANCHOR_PX, scrollElement.clientHeight / 2);
    const visibleDate = getVisibleDate(pieChartDays, virtualMetrics, anchorOffset);
    if (!visibleDate) return;

    const visibleDateKey = getDateKey(visibleDate);
    if (lastVisibleDateKeyRef.current === visibleDateKey) return;

    lastVisibleDateKeyRef.current = visibleDateKey;
    onVisibleDateChange(visibleDate);
  }, [onVisibleDateChange, pieChartDays, virtualMetrics]);

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
    }, PIE_CHART_SCROLL_IDLE_DELAY_MS);
  }, [clearEdgeExtendTimer, onReachEnd, onReachStart]);

  const processScroll = useCallback((scrollElement: HTMLDivElement) => {
    const remainingScrollBottom = scrollElement.scrollHeight - scrollElement.clientHeight - scrollElement.scrollTop;

    updateVirtualRange(scrollElement);
    updateVisibleDate(scrollElement);

    if (scrollElement.scrollTop <= PIE_CHART_SCROLL_EDGE_THRESHOLD_PX) {
      if (firstDayKey && lastReachStartKeyRef.current !== firstDayKey) {
        lastReachStartKeyRef.current = firstDayKey;
        requestEdgeExtension("start");
      }
    } else if (scrollElement.scrollTop >= PIE_CHART_SCROLL_EDGE_RESET_PX) {
      lastReachStartKeyRef.current = null;
      if (pendingEdgeDirectionRef.current === "start") {
        pendingEdgeDirectionRef.current = null;
        clearEdgeExtendTimer();
      }
    }

    if (remainingScrollBottom <= PIE_CHART_SCROLL_EDGE_THRESHOLD_PX) {
      if (lastDayKey && lastReachEndKeyRef.current !== lastDayKey) {
        lastReachEndKeyRef.current = lastDayKey;
        requestEdgeExtension("end");
      }
    } else if (remainingScrollBottom >= PIE_CHART_SCROLL_EDGE_RESET_PX) {
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
      pieChartDays.some((day) => day.dateKey === previousFirstDayKey)
    ) {
      const scrollHeightDelta = scrollElement.scrollHeight - previousScrollHeight;
      if (scrollHeightDelta > 0) {
        scrollElement.scrollTop += scrollHeightDelta;
      }
    }

    previousFirstDayKeyRef.current = firstDayKey;
    previousScrollHeightRef.current = scrollElement?.scrollHeight ?? 0;
    updateVirtualRange(scrollElement);
  }, [firstDayKey, pieChartDays, updateVirtualRange]);

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
    <div className={cn("flex h-full min-h-0 bg-white text-[#1c1c1e]", className)}>
      <main className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollViewportRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 scrollbar-hidden sm:px-6 sm:pb-10 sm:pt-6" onScroll={handleScroll}>
          <div className="mx-auto w-full max-w-[760px]">
            <div className="relative w-full" style={{ height: virtualMetrics.totalHeight }}>
              {renderedDays.map((day, index) => {
                const dayIndex = virtualRange.start + index;

                return (
                  <div
                    key={day.dateKey}
                    className="absolute left-0 right-0"
                    style={{ top: virtualMetrics.offsets[dayIndex], height: virtualMetrics.heights[dayIndex] }}
                  >
                    <CalendarPieChartDayCard
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
          </div>
        </div>
      </main>
    </div>
  );
};

const DailyClockPie = memo(DailyClockPieComponent);

DailyClockPie.displayName = "DailyClockPie";

const CalendarPieChartDayCard = memo(CalendarPieChartDayCardComponent);

CalendarPieChartDayCard.displayName = "CalendarPieChartDayCard";

const CalendarPieChartView = memo(CalendarPieChartViewComponent);

CalendarPieChartView.displayName = "CalendarPieChartView";

export { CalendarPieChartView };