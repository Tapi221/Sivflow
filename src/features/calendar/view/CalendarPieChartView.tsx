import { useMemo } from "react";
import { addDays, differenceInMinutes, format, isAfter, isBefore, startOfDay } from "date-fns";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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

const DEFAULT_SEGMENT_COLOR = "#8e8e93";

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
  const totalMinutes = segments.reduce((sum, segment) => sum + segment.minutes, 0);
  const hasSegments = segments.length > 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white px-6 pb-6 pt-5 text-[#1c1c1e]", className)}>
      <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#8e8e93]">
            {format(selectedDate, "yyyy年M月d日")}
          </p>
          <h2 className="mt-1 truncate text-[22px] font-bold tracking-[-0.03em] text-[#1c1c1e]">
            予定の円グラフ
          </h2>
        </div>
        <div className="shrink-0 rounded-2xl border border-[#eeeeee] bg-white px-4 py-3 text-right shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
          <p className="text-[11px] font-semibold text-[#9a9a9a]">合計</p>
          <p className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-[#1c1c1e]">
            {formatDuration(totalMinutes)}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-5 max-[980px]:grid-cols-1">
        <section className="flex min-h-0 flex-col rounded-[28px] border border-[#eeeeee] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-bold text-[#3a3a3c]">カテゴリ別の時間</h3>
            <span className="rounded-full border border-[#eeeeee] bg-white px-3 py-1 text-[11px] font-semibold text-[#8e8e93]">
              {segments.length}項目
            </span>
          </div>

          <div className="relative min-h-[360px] flex-1">
            {hasSegments ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segments}
                      dataKey="minutes"
                      nameKey="label"
                      innerRadius="58%"
                      outerRadius="86%"
                      paddingAngle={1}
                      strokeWidth={0}
                    >
                      {segments.map((segment) => (
                        <Cell
                          key={segment.id}
                          fill={segment.color}
                          stroke="rgba(255,255,255,0.94)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [formatDuration(Number(value)), name]}
                      contentStyle={{ borderRadius: 14, borderColor: "#eeeeee", boxShadow: "0 12px 28px rgba(15,23,42,0.12)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-white/88 px-6 py-5 text-center shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur">
                    <p className="text-[11px] font-semibold text-[#9a9a9a]">合計</p>
                    <p className="mt-1 text-[24px] font-bold tracking-[-0.04em] text-[#1c1c1e]">
                      {formatDuration(totalMinutes)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center rounded-[24px] border border-dashed border-[#dedede] bg-white text-center">
                <div>
                  <p className="text-[15px] font-bold text-[#6e6e73]">この日の予定はありません</p>
                  <p className="mt-2 text-[12px] font-medium text-[#a1a1a6]">
                    Google カレンダーまたはタスクの予定が入ると円グラフに表示されます。
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col rounded-[28px] border border-[#eeeeee] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-bold text-[#3a3a3c]">内訳</h3>
            <span className="text-[11px] font-semibold text-[#9a9a9a]">時間 / 割合</span>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {hasSegments ? (
              segments.map((segment) => (
                <div key={segment.id} className="rounded-2xl border border-[#f0f0f0] bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="truncate text-[13px] font-bold text-[#3a3a3c]">{segment.label}</span>
                    </div>
                    <span className="shrink-0 text-[12px] font-bold text-[#1c1c1e]">
                      {formatDuration(segment.minutes)}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ebebee]">
                    <div className="h-full rounded-full" style={{ width: `${segment.percentage}%`, backgroundColor: segment.color }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-[#9a9a9a]">
                    <span>{segment.eventCount}件</span>
                    <span>{segment.percentage}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[#eeeeee] bg-white p-4 text-[12px] font-semibold text-[#9a9a9a]">
                表示できる予定がありません。
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
