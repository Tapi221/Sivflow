import type { CSSProperties } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { addDays, addMinutes, format, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { layoutCalendarTimeGridEvents } from "@core/calendar";
import type { CalendarTimeGridLayoutEntry } from "@core/calendar";
import { eventChipAllDayClass } from "@/chip/eventchip/eventchip.allday.styles";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { CalendarWeekDayGridProps } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import * as COLOR from "./grid.color.constants.desktop";
import * as GRID from "./grid.layout.constants.desktop";
import { WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX, getWeekdayTimedEventPositionStyle } from "./weekdayTimeGridGeometry";

export type CalendarWeekDayGridRef = {
  scrollToHour: (hour: number) => void;
};

type WeekdayEventsByDay = {
  allDayEvents: Map<string, GoogleCalendarEvent[]>;
  timedEvents: Map<string, GoogleCalendarEvent[]>;
};

const WEEKDAY_HOURS = Array.from({ length: GRID.WEEKDAY_HOURS }, (_, hour) => hour);
const CURRENT_TIME_TICK_MS = GRID.WEEKDAY_CURRENT_TIME_UPDATE_INTERVAL_MS;
const END_OF_DAY_HOUR_LABEL = "24:00";
const NEXT_DAY_PREVIEW_MINUTES = 30;
const NEXT_DAY_PREVIEW_HOURS = NEXT_DAY_PREVIEW_MINUTES / GRID.WEEKDAY_MINUTES_PER_HOUR;
const WEEKDAY_TIMED_EVENT_MIN_LAYOUT_MINUTES = Math.ceil((WEEKDAY_TIMED_EVENT_MIN_HEIGHT_PX / C.DEFAULT_HOUR_ROW_HEIGHT) * GRID.WEEKDAY_MINUTES_PER_HOUR);
const WEEKDAY_HEADER_DATE_NUMBER_CLASS_NAME = "flex h-[25px] w-[25px] items-center justify-center rounded-full text-[16px] font-bold leading-none tracking-[-0.03em] tabular-nums transition-colors duration-150";
const WEEKDAY_HEADER_WEEKDAY_CLASS_NAME = "text-[11px] font-semibold leading-none text-[rgba(60,60,67,0.58)]";
const WEEKDAY_TIME_LABEL_CLASS_NAME = "text-[11px] font-medium tabular-nums text-[#b8bcc5]";
const WEEKDAY_COLUMN_BORDER_STYLE: CSSProperties = { borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB };
const WEEKDAY_BOTTOM_SPACER_STYLE: CSSProperties = { height: `calc(${NEXT_DAY_PREVIEW_HOURS} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))` };
const WEEKDAY_BOTTOM_TIME_SPACER_CLASS_NAME = "relative";
const WEEKDAY_BOTTOM_PREVIEW_SPACER_CLASS_NAME = "relative overflow-hidden";

const createEventKey = (event: GoogleCalendarEvent): string => `${event.accountId ?? ""}:${event.calendarId}:${event.id}`;

const isUnshiftedHourLabel = (hour: number): boolean => hour === 0;

const isSameCalendarDate = (left: Date, right: Date): boolean => getCalendarDateKey(left) === getCalendarDateKey(right);

const shouldSuppressEntryMinHeight = (entry: CalendarTimeGridLayoutEntry): boolean => entry.endsAfterRange;

const formatHourLabel = (hour: number): string => hour === GRID.WEEKDAY_HOURS ? END_OF_DAY_HOUR_LABEL : format(new Date(2000, 0, 1, hour), GRID.WEEKDAY_HOUR_LABEL_FORMAT);

const getCurrentTimeTopStyle = (now: Date): CSSProperties => ({
  top: `calc(${(now.getHours() * GRID.WEEKDAY_MINUTES_PER_HOUR + now.getMinutes()) / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
});

const getHourLabelClassName = (hour: number): string => cn("absolute right-2 top-0 z-10 bg-white px-1", isUnshiftedHourLabel(hour) ? null : "-translate-y-1/2", WEEKDAY_TIME_LABEL_CLASS_NAME);

const getHeaderDateNumberClassName = (isSelected: boolean, isToday: boolean): string => cn(WEEKDAY_HEADER_DATE_NUMBER_CLASS_NAME, isSelected ? "border-0 bg-[var(--ds-color-tag-sky-bg)] text-[var(--ds-color-tag-sky-fg)] shadow-none ring-0" : isToday ? "text-[#0a84ff]" : "text-[#1c1c1e]");

const getViewportGridTemplateColumns = (dayCount: number): string => `${C.TIME_COLUMN_WIDTH}px repeat(${dayCount}, minmax(0, 1fr))`;

const getTimedEntryPositionStyle = (entry: CalendarTimeGridLayoutEntry, rangeHours: number): CSSProperties => getWeekdayTimedEventPositionStyle(entry, rangeHours, { suppressMinHeight: shouldSuppressEntryMinHeight(entry) });

const toEventDate = (value: Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
};

const getEventInRange = (event: GoogleCalendarEvent, rangeStart: Date, rangeEnd: Date): GoogleCalendarEvent | null => {
  const startsAt = toEventDate(event.startsAt);
  const endsAt = toEventDate(event.endsAt);

  if (!startsAt || !endsAt) return null;

  const startTime = startsAt.getTime();
  const endTime = endsAt.getTime();
  const normalizedEndTime = endTime > startTime ? endTime : startTime + 1;

  if (startTime >= rangeEnd.getTime() || normalizedEndTime <= rangeStart.getTime()) return null;

  return event;
};

const groupEventsByDay = (events: GoogleCalendarEvent[], days: Date[]): WeekdayEventsByDay => {
  const dayKeys = new Set(days.map(getCalendarDateKey));
  const allDayEvents = new Map<string, GoogleCalendarEvent[]>();
  const timedEvents = new Map<string, GoogleCalendarEvent[]>();

  for (const day of days) {
    const key = getCalendarDateKey(day);
    allDayEvents.set(key, []);
    timedEvents.set(key, []);
  }

  for (const event of events) {
    const keys = getEventDateKeys(event).filter((key) => dayKeys.has(key));

    for (const key of keys) {
      const day = days.find((candidate) => getCalendarDateKey(candidate) === key);
      if (!day) continue;
      const clippedEvent = clipEventToDay(event, day);
      if (!clippedEvent) continue;
      const target = event.isAllDay ? allDayEvents : timedEvents;
      target.set(key, [...(target.get(key) ?? []), clippedEvent]);
    }
  }

  for (const [key, values] of allDayEvents) {
    allDayEvents.set(key, [...values].sort(compareCalendarEvents));
  }

  for (const [key, values] of timedEvents) {
    timedEvents.set(key, [...values].sort(compareCalendarEvents));
  }

  return { allDayEvents, timedEvents };
};

const createTimedLayoutEventsForRange = (events: GoogleCalendarEvent[], rangeStart: Date, rangeEnd: Date): CalendarTimeGridLayoutEntry[] => {
  const rangeEvents = events.flatMap((event) => {
    if (event.isAllDay) return [];
    const eventInRange = getEventInRange(event, rangeStart, rangeEnd);

    return eventInRange ? [eventInRange] : [];
  });

  return layoutCalendarTimeGridEvents({
    events: rangeEvents,
    rangeStart,
    rangeEnd,
    layoutMode: "no-overlap",
    minimumEventDurationMinutes: WEEKDAY_TIMED_EVENT_MIN_LAYOUT_MINUTES,
  });
};

const createTimedLayoutEvents = (events: GoogleCalendarEvent[], day: Date): CalendarTimeGridLayoutEntry[] => {
  const rangeStart = startOfDay(day);
  const rangeEnd = addDays(rangeStart, 1);

  return createTimedLayoutEventsForRange(events, rangeStart, rangeEnd);
};

const createNextDayPreviewLayoutEvents = (events: GoogleCalendarEvent[], day: Date): CalendarTimeGridLayoutEntry[] => {
  const rangeStart = addDays(startOfDay(day), 1);
  const rangeEnd = addMinutes(rangeStart, NEXT_DAY_PREVIEW_MINUTES);

  return createTimedLayoutEventsForRange(events, rangeStart, rangeEnd);
};

const useCurrentTime = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), CURRENT_TIME_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  return now;
};

const CalendarWeekDayGridComponent = ({
  headerScrollRef,
  allDayScrollRef,
  scrollContainerRef,
  visibleDays,
  visibleEvents,
  calendarGridStyle,
  onScroll,
  selectedDate,
  onSelectDate,
}: CalendarWeekDayGridProps) => {
  const now = useCurrentTime();
  const { allDayEvents, timedEvents } = useMemo(() => groupEventsByDay(visibleEvents, visibleDays), [visibleEvents, visibleDays]);
  const gridTemplateColumns = getViewportGridTemplateColumns(visibleDays.length);
  const timelineGridStyle = {
    [GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT]: calendarGridStyle[GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT],
    gridTemplateColumns,
  } as CSSProperties;
  const currentDayKey = getCalendarDateKey(now);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div ref={headerScrollRef} className="shrink-0 overflow-hidden border-b" style={{ borderColor: COLOR.WEEKDAY_COLOR_BORDER_MAIN }}>
        <div className="grid min-w-0" style={{ gridTemplateColumns }}>
          <div className="h-12" />
          {visibleDays.map((day) => {
            const dayKey = getCalendarDateKey(day);
            const isSelected = isSameCalendarDate(day, selectedDate);
            const isToday = isSameCalendarDate(day, now);

            return (
              <div key={dayKey} className="flex h-12 min-w-0 items-center justify-center px-2">
                <button type="button" className="flex h-12 w-full min-w-0 items-center justify-center gap-1 bg-transparent p-0 text-center outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/25" aria-pressed={isSelected} onClick={() => onSelectDate?.(day)}>
                  <span className={getHeaderDateNumberClassName(isSelected, isToday)}>{format(day, "d", { locale: ja })}</span>
                  <span className={WEEKDAY_HEADER_WEEKDAY_CLASS_NAME}>{format(day, "EEE", { locale: ja })}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={allDayScrollRef} className="shrink-0 overflow-hidden border-b" style={{ borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }}>
        <div className="grid min-w-0" style={{ gridTemplateColumns }}>
          <div className={cn("flex min-h-10 min-w-0 items-start justify-end px-2 py-2", WEEKDAY_TIME_LABEL_CLASS_NAME)}>終日</div>
          {visibleDays.map((day) => {
            const dayKey = getCalendarDateKey(day);
            const events = allDayEvents.get(dayKey) ?? [];
            return (
              <div key={dayKey} className="min-h-10 min-w-0 border-l px-1 py-1" style={WEEKDAY_COLUMN_BORDER_STYLE}>
                <div className="flex min-w-0 flex-col gap-1">
                  {events.map((event) => {
                    const tokens = generateColorTokens(event.accentColor);
                    return (
                      <div key={createEventKey(event)} className={eventChipAllDayClass} style={{ background: tokens.bg, color: tokens.text }} title={event.title}>
                        {event.title || "Untitled"}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={scrollContainerRef} className="calendar-timeline-scroll scrollbar-hidden -mt-2 min-h-0 flex-1 overflow-auto pt-2" onScroll={onScroll}>
        <div className="grid min-w-0" style={timelineGridStyle}>
          <div className="relative min-w-0 bg-white" style={{ zIndex: GRID.WEEKDAY_GRID_TIME_COLUMN_Z_INDEX }}>
            {WEEKDAY_HOURS.map((hour) => (
              <div key={hour} className="relative border-b" style={{ height: `var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT})`, borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }}>
                <span className={getHourLabelClassName(hour)}>{formatHourLabel(hour)}</span>
              </div>
            ))}
            <div className={WEEKDAY_BOTTOM_TIME_SPACER_CLASS_NAME} data-testid="weekday-time-bottom-spacer" style={WEEKDAY_BOTTOM_SPACER_STYLE}>
              <span className={getHourLabelClassName(GRID.WEEKDAY_HOURS)}>{formatHourLabel(GRID.WEEKDAY_HOURS)}</span>
            </div>
          </div>

          {visibleDays.map((day) => {
            const dayKey = getCalendarDateKey(day);
            const events = createTimedLayoutEvents(timedEvents.get(dayKey) ?? [], day);
            const nextDayPreviewEvents = createNextDayPreviewLayoutEvents(visibleEvents, day);
            const isToday = dayKey === currentDayKey;
            return (
              <div key={dayKey} className="relative min-w-0 border-l bg-white" style={WEEKDAY_COLUMN_BORDER_STYLE}>
                {WEEKDAY_HOURS.map((hour) => (
                  <div key={hour} className="border-b" style={{ height: `var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT})`, borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }} />
                ))}
                <div className={WEEKDAY_BOTTOM_PREVIEW_SPACER_CLASS_NAME} data-testid="weekday-preview-bottom-spacer" style={WEEKDAY_BOTTOM_SPACER_STYLE}>
                  {nextDayPreviewEvents.map((entry) => (
                    <div key={createEventKey(entry.event)} className="absolute z-10 min-w-0" style={getTimedEntryPositionStyle(entry, NEXT_DAY_PREVIEW_HOURS)}>
                      <CalendarEventChipWeekday event={entry.event} />
                    </div>
                  ))}
                </div>

                {isToday ? (
                  <div className="pointer-events-none absolute left-0 right-0 z-20" style={getCurrentTimeTopStyle(now)}>
                    <div className="h-px bg-blue-500" />
                  </div>
                ) : null}

                {events.map((entry) => (
                  <div key={createEventKey(entry.event)} className="absolute z-10 min-w-0" style={getTimedEntryPositionStyle(entry, GRID.WEEKDAY_HOURS)}>
                    <CalendarEventChipWeekday event={entry.event} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CalendarWeekDayGrid = memo(CalendarWeekDayGridComponent);

CalendarWeekDayGrid.displayName = "CalendarWeekDayGrid";

export { CalendarWeekDayGrid };
