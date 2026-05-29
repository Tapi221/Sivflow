import type { CSSProperties } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarDateButton, CalendarDateContent } from "@/chip/button/GridHeader.scheduletimeline";
import { eventChipAllDayClass } from "@/chip/eventchip/eventchip.allday.styles";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.weekday";
import { computeEventLayout, toLayoutEvent } from "@/chip/eventchip/EventChip.weekday.placement";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import type { CalendarWeekDayGridProps } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import * as COLOR from "./grid.color.constants.desktop";
import * as GRID from "./grid.layout.constants.desktop";

type CalendarEventPositionStyle = CSSProperties & {
  left: string;
  top: string;
  width: string;
  height: string;
};

type TimedLayoutEvent = {
  key: string;
  event: GoogleCalendarEvent;
  layout: {
    left: number;
    width: number;
  };
};

export type CalendarWeekDayGridRef = {
  scrollToHour: (hour: number) => void;
};

const WEEKDAY_HOURS = Array.from({ length: GRID.WEEKDAY_HOURS }, (_, hour) => hour);
const EVENT_COLUMN_GAP_PX = 4;
const EVENT_COLUMN_INSET_PX = 3;
const CURRENT_TIME_TICK_MS = GRID.WEEKDAY_CURRENT_TIME_UPDATE_INTERVAL_MS;

const createEventKey = (event: GoogleCalendarEvent): string => `${event.accountId ?? ""}:${event.calendarId}:${event.id}`;

const isSameCalendarDate = (left: Date, right: Date): boolean => getCalendarDateKey(left) === getCalendarDateKey(right);

const getEventDurationMinutes = (event: GoogleCalendarEvent): number => Math.max(1, Math.round((event.endsAt.getTime() - event.startsAt.getTime()) / 60_000));

const getTimedEventPositionStyle = ({ event, layout }: TimedLayoutEvent): CalendarEventPositionStyle => ({
  left: `calc(${layout.left * 100}% + ${EVENT_COLUMN_INSET_PX}px)`,
  top: `calc(${(event.startsAt.getHours() * GRID.WEEKDAY_MINUTES_PER_HOUR + event.startsAt.getMinutes()) / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
  width: `calc(${layout.width * 100}% - ${EVENT_COLUMN_GAP_PX + EVENT_COLUMN_INSET_PX}px)`,
  height: `max(${C.MIN_EVENT_DISPLAY_HEIGHT_PX}px, calc(${getEventDurationMinutes(event) / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT})))`,
});

const getCurrentTimeTopStyle = (now: Date): CSSProperties => ({
  top: `calc(${(now.getHours() * GRID.WEEKDAY_MINUTES_PER_HOUR + now.getMinutes()) / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT}))`,
});

const groupEventsByDay = (events: GoogleCalendarEvent[], days: Date[]) => {
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

const createTimedLayoutEvents = (events: GoogleCalendarEvent[]): TimedLayoutEvent[] => {
  const layoutEvents = events.map((event) => toLayoutEvent(createEventKey(event), event.startsAt, getEventDurationMinutes(event), C.MIN_LAYOUT_MINUTES));
  const layoutByKey = computeEventLayout(layoutEvents);

  return events.map((event) => {
    const key = createEventKey(event);
    return {
      key,
      event,
      layout: layoutByKey.get(key) ?? { left: 0, width: 1 },
    };
  });
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
  calendarDayColumnWidth,
  calendarGridStyle,
  onScroll,
  selectedDate,
  onSelectDate,
}: CalendarWeekDayGridProps) => {
  const now = useCurrentTime();
  const { allDayEvents, timedEvents } = useMemo(() => groupEventsByDay(visibleEvents, visibleDays), [visibleEvents, visibleDays]);
  const gridTemplateColumns = `${C.TIME_COLUMN_WIDTH}px repeat(${visibleDays.length}, minmax(${calendarDayColumnWidth}px, 1fr))`;
  const contentMinWidth = C.TIME_COLUMN_WIDTH + visibleDays.length * calendarDayColumnWidth;
  const currentDayKey = getCalendarDateKey(now);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div ref={headerScrollRef} className="shrink-0 overflow-hidden border-b" style={{ borderColor: COLOR.WEEKDAY_COLOR_BORDER_MAIN }}>
        <div className="grid" style={{ gridTemplateColumns, minWidth: contentMinWidth }}>
          <div className="h-12" />
          {visibleDays.map((day) => {
            const dayKey = getCalendarDateKey(day);
            return (
              <div key={dayKey} className="flex h-12 items-center justify-center border-l px-2" style={{ borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }}>
                <CalendarDateButton selected={isSameCalendarDate(day, selectedDate)} today={isSameCalendarDate(day, now)} onClick={() => onSelectDate?.(day)}>
                  <CalendarDateContent dayLabel={format(day, GRID.WEEKDAY_DAY_FORMAT, { locale: ja })} dateLabel={format(day, GRID.WEEKDAY_DATE_FORMAT, { locale: ja })} />
                </CalendarDateButton>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={allDayScrollRef} className="shrink-0 overflow-hidden border-b" style={{ borderColor: COLOR.WEEKDAY_COLOR_BORDER_MAIN }}>
        <div className="grid" style={{ gridTemplateColumns, minWidth: contentMinWidth }}>
          <div className="flex min-h-10 items-start justify-end px-2 py-2 text-[11px] font-semibold text-slate-400">終日</div>
          {visibleDays.map((day) => {
            const dayKey = getCalendarDateKey(day);
            const events = allDayEvents.get(dayKey) ?? [];
            return (
              <div key={dayKey} className="min-h-10 border-l px-1 py-1" style={{ borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }}>
                <div className="flex flex-col gap-1">
                  {events.map((event) => {
                    const tokens = generateColorTokens(event.accentColor);
                    return (
                      <div key={createEventKey(event)} className={eventChipAllDayClass} style={{ background: tokens.bg, color: tokens.text, borderLeft: `3px solid ${tokens.border}` }} title={event.title}>
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

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto" onScroll={onScroll}>
        <div className="grid" style={{ ...calendarGridStyle, gridTemplateColumns, minWidth: contentMinWidth }}>
          <div className="relative border-r bg-white" style={{ borderColor: COLOR.WEEKDAY_COLOR_BORDER_MAIN, zIndex: GRID.WEEKDAY_GRID_TIME_COLUMN_Z_INDEX }}>
            {WEEKDAY_HOURS.map((hour) => (
              <div key={hour} className="relative border-b" style={{ height: `var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT})`, borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }}>
                <span className="absolute right-2 top-0 -translate-y-1/2 text-[11px] font-medium tabular-nums text-slate-400">{format(new Date(2000, 0, 1, hour), GRID.WEEKDAY_HOUR_LABEL_FORMAT)}</span>
              </div>
            ))}
          </div>

          {visibleDays.map((day) => {
            const dayKey = getCalendarDateKey(day);
            const events = createTimedLayoutEvents(timedEvents.get(dayKey) ?? []);
            const isToday = dayKey === currentDayKey;
            return (
              <div key={dayKey} className={cn("relative border-l", isToday && "bg-[#f8fbff]")} style={{ borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }}>
                {WEEKDAY_HOURS.map((hour) => (
                  <div key={hour} className="border-b" style={{ height: `var(${GRID.WEEKDAY_CSS_VAR_HOUR_ROW_HEIGHT})`, borderColor: COLOR.WEEKDAY_COLOR_BORDER_SUB }} />
                ))}

                {isToday ? (
                  <div className="pointer-events-none absolute left-0 right-0 z-20" style={getCurrentTimeTopStyle(now)}>
                    <div className="h-px bg-blue-500" />
                  </div>
                ) : null}

                {events.map((layoutEvent) => (
                  <div key={layoutEvent.key} className="absolute z-10 min-w-0" style={getTimedEventPositionStyle(layoutEvent)}>
                    <CalendarEventChipWeekday event={layoutEvent.event} />
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
