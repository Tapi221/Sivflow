import { useMemo } from "react";
import { addDays, differenceInMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import type { AppCalendarItem, GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";

type CalendarPieChartViewProps = {
  selectedDate: Date;
  events: GoogleCalendarEvent[];
  appProjects: AppCalendarItem[];
  googleAccounts: GoogleAccountDisplay[];
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
  selectedDate: Date,
  events: GoogleCalendarEvent[],
  appProjects: AppCalendarItem[],
  googleAccounts: GoogleAccountDisplay[],
): DailyPieSlice[] => {
  const dayStart = startOfDay(selectedDate);
  const dayEnd = addDays(dayStart, 1);
  const calendarLabelById = createCalendarLabelMap(googleAccounts);
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
        id: `gap:${cursor}:${startMinute}`,
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
        id: `${event.id}:${event.sourceId}:${startMinute}:${endMinute}`,
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
      id: `gap:${cursor}:${FULL_DAY_MINUTES}`,
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

const truncateChartLabel = (label: string) => {
  if (label.length <= 6) return label;

  return `${label.slice(0, 5)}…`;
};

const DailyClockPie = ({ slices }: DailyClockPieProps) => {
  const visibleSlices = slices.filter((slice) => slice.minutes > 0);
  const hasTimedSlices = visibleSlices.some((slice) => !slice.isGap);

  return (
    <div className="flex h-full w-full min-w-0 items-center justify-center">
      <div className="relative aspect-square w-[min(100%,72vh)] max-w-[720px] min-w-0">
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
                <span key={hour} className="absolute -translate-x-1/2 -translate-y-1/2 text-[clamp(11px,2.1vw,18px)] font-medium leading-none text-[#8e8e93]" style={getChartOverlayStyle(hour * 60, CHART_CLOCK_LABEL_RADIUS)}>
                  {hour}
                </span>
              ))}

              {visibleSlices.filter((slice) => !slice.isGap && slice.minutes >= 30).map((slice) => {
                const labelMinute = (slice.startMinute + slice.endMinute) / 2;

                return (
                  <span key={`label:${slice.id}`} className="absolute -translate-x-1/2 -translate-y-1/2 text-center text-[clamp(9px,1.75vw,15px)] font-semibold leading-[1.05] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]" style={{ ...getChartOverlayStyle(labelMinute, CHART_LABEL_RADIUS), color: slice.labelColor }}>
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

const CalendarPieChartView = ({
  selectedDate,
  events,
  appProjects,
  googleAccounts,
  className,
}: CalendarPieChartViewProps) => {
  const plannedSlices = useMemo(
    () => buildDailyPieSlices(selectedDate, events, appProjects, googleAccounts),
    [appProjects, events, googleAccounts, selectedDate],
  );

  return (
    <div className={cn("flex h-full min-h-0 bg-white text-[#1c1c1e]", className)}>
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
          <DailyClockPie slices={plannedSlices} />
        </div>
      </main>
    </div>
  );
};

export { CalendarPieChartView };