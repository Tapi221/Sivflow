import { memo, useMemo } from "react";
import { layoutCalendarTimeGridEvents } from "@core/calendar";
import type { CalendarEvent, CalendarTimeGridLayoutMode } from "@core/calendar";
import { CalendarEventChip } from "./CalendarEventChip";

type CalendarTimeGridProperties = {
  events: readonly CalendarEvent[];
  rangeStart: Date;
  rangeEnd: Date;
  layoutMode?: CalendarTimeGridLayoutMode;
  hourHeight?: number;
};

type TimeGridHourLabel = {
  label: string;
  top: number;
};

const DEFAULT_HOUR_HEIGHT = 72;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const PERCENT_MAX = 100;

const getMinutesFromRangeStart = (rangeStart: Date, date: Date): number => {
  return (date.getTime() - rangeStart.getTime()) / 60_000;
};

const getRangeDurationMinutes = (rangeStart: Date, rangeEnd: Date): number => {
  return Math.max(MINUTES_IN_HOUR, getMinutesFromRangeStart(rangeStart, rangeEnd));
};

const getHourLabels = (rangeStart: Date, rangeEnd: Date): TimeGridHourLabel[] => {
  const rangeMinutes = getRangeDurationMinutes(rangeStart, rangeEnd);
  const labels: TimeGridHourLabel[] = [];
  const startHour = rangeStart.getHours();
  const totalHours = Math.ceil(rangeMinutes / MINUTES_IN_HOUR);

  for (let index = 0; index <= totalHours; index += 1) {
    const hour = (startHour + index) % HOURS_IN_DAY;

    labels.push({
      label: `${hour}:00`,
      top: (index * MINUTES_IN_HOUR / rangeMinutes) * PERCENT_MAX,
    });
  }

  return labels;
};

const CalendarTimeGrid = memo(({ events, rangeStart, rangeEnd, layoutMode = "no-overlap", hourHeight = DEFAULT_HOUR_HEIGHT }: CalendarTimeGridProperties) => {
  const layoutEntries = useMemo(
    () => layoutCalendarTimeGridEvents({ events, rangeStart, rangeEnd, layoutMode }),
    [events, layoutMode, rangeEnd, rangeStart],
  );
  const hourLabels = useMemo(() => getHourLabels(rangeStart, rangeEnd), [rangeEnd, rangeStart]);
  const rangeMinutes = getRangeDurationMinutes(rangeStart, rangeEnd);
  const contentHeight = Math.max(hourHeight, (rangeMinutes / MINUTES_IN_HOUR) * hourHeight);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 text-slate-100">
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
        <div className="relative" style={{ height: contentHeight }}>
          {hourLabels.map((hour) => (
            <div key={`${hour.label}-${hour.top}`} className="absolute right-0 pr-2 text-xs tabular-nums text-slate-500" style={{ top: `calc(${hour.top}% - 8px)` }}>
              {hour.label}
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80" style={{ height: contentHeight }}>
          {hourLabels.map((hour) => (
            <div key={`${hour.label}-line-${hour.top}`} className="absolute left-0 right-0 border-t border-slate-800/80" style={{ top: `${hour.top}%` }} />
          ))}

          <div className="absolute inset-y-0 left-0 right-0">
            {layoutEntries.map((entry) => (
              <CalendarEventChip key={`${entry.event.calendarId}:${entry.event.id}`} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

CalendarTimeGrid.displayName = "CalendarTimeGrid";

export { CalendarTimeGrid };
