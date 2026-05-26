import { useMemo } from "react";
import { addDays, differenceInMinutes, format, isAfter, isBefore, startOfDay } from "date-fns";
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

type PieChartSegment = {
  id: string;
  label: string;
  color: string;
  minutes: number;
  eventCount: number;
  percentage: number;
};

type DonutChartSegment = PieChartSegment & {
  dashArray: string;
  dashOffset: number;
};

const DEFAULT_SEGMENT_COLOR = "#8e8e93";
const DONUT_RADIUS = 70;
const DONUT_STROKE_WIDTH = 28;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

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

const getEventOverlapMinutes = (
  event: GoogleCalendarEvent,
  selectedDate: Date,
): number => {
  if (event.isAllDay) return 0;

  const dayStart = startOfDay(selectedDate);
  const dayEnd = addDays(dayStart, 1);

  if (!isBefore(event.startsAt, dayEnd) || !isAfter(event.endsAt, dayStart)) {
    return 0;
  }

  const startsAt = isBefore(event.startsAt, dayStart) ? dayStart : event.startsAt;
  const endsAt = isAfter(event.endsAt, dayEnd) ? dayEnd : event.endsAt;

  return Math.max(0, differenceInMinutes(endsAt, startsAt));
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

const buildPieChartSegments = (
  selectedDate: Date,
  events: GoogleCalendarEvent[],
  appProjects: AppCalendarItem[],
  googleAccounts: GoogleAccountDisplay[],
): PieChartSegment[] => {
  const calendarLabelById = createCalendarLabelMap(googleAccounts);
  const segmentById = new Map<string, PieChartSegment>();

  events.forEach((event) => {
    const minutes = getEventOverlapMinutes(event, selectedDate);
    if (minutes <= 0) return;

    const meta = resolveEventSegmentMeta(event, appProjects, calendarLabelById);
    const current = segmentById.get(meta.id);

    if (current) {
      current.minutes += minutes;
      current.eventCount += 1;
      return;
    }

    segmentById.set(meta.id, {
      ...meta,
      minutes,
      eventCount: 1,
      percentage: 0,
    });
  });

  const segments = Array.from(segmentById.values()).sort(
    (a, b) => b.minutes - a.minutes,
  );
  const totalMinutes = segments.reduce((sum, segment) => sum + segment.minutes, 0);

  return segments.map((segment) => ({
    ...segment,
    percentage: totalMinutes > 0 ? Math.round((segment.minutes / totalMinutes) * 100) : 0,
  }));
};

const buildDonutChartSegments = (segments: PieChartSegment[]): DonutChartSegment[] => {
  const totalMinutes = segments.reduce((sum, segment) => sum + segment.minutes, 0);
  let consumedLength = 0;

  return segments.map((segment) => {
    const rawLength = totalMinutes > 0
      ? (segment.minutes / totalMinutes) * DONUT_CIRCUMFERENCE
      : 0;
    const gapLength = segments.length > 1 ? 1.25 : 0;
    const visibleLength = Math.max(0, rawLength - gapLength);
    const dashOffset = -consumedLength;

    consumedLength += rawLength;

    return {
      ...segment,
      dashArray: `${visibleLength} ${DONUT_CIRCUMFERENCE - visibleLength}`,
      dashOffset,
    };
  });
};

export const CalendarPieChartView = ({
  selectedDate,
  events,
  appProjects,
  googleAccounts,
  className,
}: CalendarPieChartViewProps) => {
  const segments = useMemo(
    () => buildPieChartSegments(selectedDate, events, appProjects, googleAccounts),
    [appProjects, events, googleAccounts, selectedDate],
  );
  const donutSegments = useMemo(() => buildDonutChartSegments(segments), [segments]);
  const totalMinutes = segments.reduce((sum, segment) => sum + segment.minutes, 0);
  const hasSegments = segments.length > 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white text-[#1c1c1e]", className)}>
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#eeeeee] px-5">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#1c1c1e]">
            予定の円グラフ
          </h2>
          <p className="mt-0.5 text-[11px] font-semibold text-[#9a9a9a]">
            {format(selectedDate, "yyyy年M月d日")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold text-[#9a9a9a]">合計</p>
          <p className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em] text-[#1c1c1e]">
            {formatDuration(totalMinutes)}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] max-[980px]:grid-cols-1">
        <section className="flex min-h-0 flex-col bg-white px-5 py-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-[12px] font-semibold text-[#6e6e73]">カテゴリ別の時間</h3>
            <span className="text-[11px] font-semibold text-[#9a9a9a]">
              {segments.length}項目
            </span>
          </div>

          <div className="relative min-h-[360px] flex-1">
            {hasSegments ? (
              <div className="relative flex h-full min-h-[360px] items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  role="img"
                  aria-label={`予定の円グラフ 合計 ${formatDuration(totalMinutes)}`}
                  className="h-full max-h-[430px] w-full max-w-[430px]"
                >
                  <circle
                    cx="100"
                    cy="100"
                    r={DONUT_RADIUS}
                    fill="none"
                    stroke="#f1f1f1"
                    strokeWidth={DONUT_STROKE_WIDTH}
                  />
                  <g transform="rotate(-90 100 100)">
                    {donutSegments.map((segment) => (
                      <circle
                        key={segment.id}
                        cx="100"
                        cy="100"
                        r={DONUT_RADIUS}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth={DONUT_STROKE_WIDTH}
                        strokeDasharray={segment.dashArray}
                        strokeDashoffset={segment.dashOffset}
                      >
                        <title>
                          {segment.label}: {formatDuration(segment.minutes)} / {segment.percentage}%
                        </title>
                      </circle>
                    ))}
                  </g>
                </svg>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-white/90 px-5 py-4 text-center shadow-[0_1px_4px_rgba(15,23,42,0.08)] backdrop-blur">
                    <p className="text-[11px] font-semibold text-[#9a9a9a]">合計</p>
                    <p className="mt-1 text-[21px] font-semibold tracking-[-0.03em] text-[#1c1c1e]">
                      {formatDuration(totalMinutes)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center text-center">
                <div>
                  <p className="text-[14px] font-semibold text-[#6e6e73]">この日の時間指定の予定はありません</p>
                  <p className="mt-2 text-[12px] font-medium text-[#a1a1a6]">
                    終日の予定は時間集計から除外しています。
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-l border-[#eeeeee] bg-white px-4 py-4 max-[980px]:border-l-0 max-[980px]:border-t">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-[12px] font-semibold text-[#6e6e73]">内訳</h3>
            <span className="text-[11px] font-semibold text-[#9a9a9a]">時間 / 割合</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {hasSegments ? (
              segments.map((segment) => (
                <div key={segment.id} className="border-b border-[#f1f1f1] py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="truncate text-[12px] font-semibold text-[#3a3a3c]">{segment.label}</span>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold text-[#1c1c1e]">
                      {formatDuration(segment.minutes)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eeeeee]">
                    <div className="h-full rounded-full" style={{ width: `${segment.percentage}%`, backgroundColor: segment.color }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-[#9a9a9a]">
                    <span>{segment.eventCount}件</span>
                    <span>{segment.percentage}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-3 text-[12px] font-semibold text-[#9a9a9a]">
                終日の予定は時間集計から除外しています。
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};