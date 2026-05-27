import { useMemo } from "react";
import { addDays, differenceInMinutes, isAfter, isBefore, startOfDay } from "date-fns";
import type { AppCalendarItem, GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
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
  minutes: number;
  eventCount: number;
  percentage: number;
  startMinute: number;
  endMinute: number;
  isGap: boolean;
};

type DailyClockPieProps = {
  title: string;
  totalMinutes: number;
  slices: DailyPieSlice[];
  isActual?: boolean;
};

const DEFAULT_SEGMENT_COLOR = "#8e8e93";
const GAP_SEGMENT_COLOR = "#f7f7f8";
const FULL_DAY_MINUTES = 24 * 60;
const CHART_CENTER = 100;
const CHART_RADIUS = 75;
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
      labelByCalendarId.set(
        calendar.id,
        calendar.summaryOverride ?? calendar.summary,
      );
    });
  });

  return labelByCalendarId;
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

  return [
    `M ${CHART_CENTER} ${CHART_CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${CHART_RADIUS} ${CHART_RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

const resolveEventSegmentMeta = (
  event: GoogleCalendarEvent,
  appProjects: AppCalendarItem[],
  calendarLabelById: Map<string, string>,
) => {
  const project = appProjects.find(
    (item) => item.id === event.projectId || item.label === event.projectId,
  );

  if (project) {
    return {
      id: `project:${project.id}`,
      label: project.label,
      color: project.color,
    };
  }

  if (event.projectId) {
    return {
      id: `project:${event.projectId}`,
      label: event.projectId,
      color: event.accentColor || DEFAULT_SEGMENT_COLOR,
    };
  }

  const calendarLabel = calendarLabelById.get(event.calendarId);

  return {
    id: `calendar:${event.calendarId}`,
    label: calendarLabel ?? event.title,
    color: event.accentColor || DEFAULT_SEGMENT_COLOR,
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

const DailyClockPie = ({ title, totalMinutes, slices, isActual = false }: DailyClockPieProps) => {
  const visibleSlices = slices.filter((slice) => slice.minutes > 0);
  const hasTimedSlices = visibleSlices.some((slice) => !slice.isGap);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className={cn(
        "mb-1 rounded-[7px] px-9 py-1 text-center text-[15px] font-semibold tracking-[-0.02em]",
        isActual ? "bg-[#dff6e8] text-[#26914f]" : "bg-[#eee9ff] text-[#7560d8]",
      )}>
        {title}
      </div>
      <p className="mb-6 text-[12px] font-semibold text-[#6e6e73]">計 {formatDuration(totalMinutes)}</p>

      <div className="relative aspect-square w-full max-w-[430px] min-w-[300px]">
        {hasTimedSlices ? (
          <svg viewBox="0 0 200 200" role="img" aria-label={`${title} 計 ${formatDuration(totalMinutes)}`} className="h-full w-full overflow-visible">
            {visibleSlices.map((slice) => (
              slice.endMinute - slice.startMinute >= FULL_DAY_MINUTES ? (
                <circle key={slice.id} cx={CHART_CENTER} cy={CHART_CENTER} r={CHART_RADIUS} fill={slice.color} />
              ) : (
                <path key={slice.id} d={buildWedgePath(slice.startMinute, slice.endMinute)} fill={slice.color} stroke="rgba(255,255,255,0.7)" strokeWidth={0.35}>
                  <title>
                    {slice.label}: {formatDuration(slice.minutes)}
                  </title>
                </path>
              )
            ))}

            {CLOCK_HOURS.map((hour) => {
              const minute = hour * 60;
              const inner = polarToCartesian(minute, CHART_RADIUS - 5);
              const outer = polarToCartesian(minute, CHART_RADIUS + 2);
              const label = polarToCartesian(minute, CHART_RADIUS + 11);

              return (
                <g key={hour}>
                  <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
                  <text x={label.x} y={label.y + 3} textAnchor="middle" className="fill-[#8e8e93] text-[8px] font-medium">
                    {hour}
                  </text>
                </g>
              );
            })}

            {visibleSlices.filter((slice) => !slice.isGap && slice.minutes >= 30).map((slice) => {
              const labelPosition = polarToCartesian((slice.startMinute + slice.endMinute) / 2, CHART_RADIUS * 0.58);

              return (
                <text key={`label:${slice.id}`} x={labelPosition.x} y={labelPosition.y} textAnchor="middle" className="pointer-events-none fill-white text-[8px] font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
                  <tspan x={labelPosition.x} dy="-0.2em">{truncateChartLabel(slice.label)}</tspan>
                  <tspan x={labelPosition.x} dy="1.15em">{formatDuration(slice.minutes)}</tspan>
                </text>
              );
            })}
          </svg>
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
  const plannedMinutes = plannedSlices.reduce((sum, slice) => slice.isGap ? sum : sum + slice.minutes, 0);

  return (
    <div className={cn("flex h-full min-h-0 bg-white text-[#1c1c1e]", className)}>
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center gap-12 overflow-hidden px-8 py-6 max-[1120px]:gap-6 max-[980px]:flex-col max-[980px]:overflow-y-auto">
          <DailyClockPie title="予定" totalMinutes={plannedMinutes} slices={plannedSlices} />
          <DailyClockPie title="実績" totalMinutes={0} slices={[]} isActual />
        </div>
      </main>
    </div>
  );
};

export { CalendarPieChartView };
