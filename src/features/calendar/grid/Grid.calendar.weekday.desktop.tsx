import type { CSSProperties } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { clipEventToDay, compareCalendarEvents, getCalendarDateKey, getEventDateKeys } from "@/features/calendar/calendarEventRange";
import { eventChipAllDayClass } from "@/chip/eventchip/eventchip.allday.styles";
import { computeEventLayout, toLayoutEvent } from "@/chip/eventchip/EventChip.layout.weekday.desktop";
import * as COLOR from "@/features/calendar/grid/grid.color.constants.desktop";
import * as GRID from "@/features/calendar/grid/grid.layout.constants.desktop";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { CalendarWeekDayGridProps } from "@/features/calendar/scheduleScreen.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";
import { CalendarDateButton, CalendarDateContent } from "@/chip/button/GridHeader.scheduletimeline";
import { CalendarEventChipWeekday } from "@/chip/eventchip/EventChip.schedule.weekday";
import { cn } from "@/lib/utils";

type CalendarEventPositionStyle = CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

type WeekdayDayEvents = {
  allDayEvents: GoogleCalendarEvent[];
  timedEvents: GoogleCalendarEvent[];
};

const HOURS = Array.from({ length: GRID.WEEKDAY_HOURS }, (_, index) => index);
const MIN_LAYOUT_MINUTES = C.MIN_LAYOUT_MINUTES;
const MAX_ALL_DAY_VISIBLE_CHIPS = 3;

const EMPTY_WEEKDAY_DAY_EVENTS: WeekdayDayEvents = {
  allDayEvents: [],
  timedEvents: [],
};

const createHourLabel = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00`;

const createMinuteLabel = (totalMinutes: number) => {
  const hour = Math.floor(totalMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR);
  const minutes = totalMinutes % GRID.WEEKDAY_MINUTES_PER_HOUR;

  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const getEventDurationMinutes = (event: GoogleCalendarEvent): number => {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const diff = end - start;
  return diff > 0 ? diff / 60000 : 30;
};

const calculateEventPositionStyle = (
  event: GoogleCalendarEvent,
): CalendarEventPositionStyle => {
  const startsAt = new Date(event.startsAt);
  const startHour =
    startsAt.getHours() + startsAt.getMinutes() / GRID.WEEKDAY_MINUTES_PER_HOUR;
  const durationMinutes = Math.max(getEventDurationMinutes(event), MIN_LAYOUT_MINUTES);

  return {
    [GRID.WEEKDAY_CSS_VAR_EVENT_START_HOUR]: Math.max(0, startHour),
    [GRID.WEEKDAY_CSS_VAR_EVENT_DURATION_HOURS]:
      durationMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR,
    top: `calc(var(${GRID.WEEKDAY_CSS_VAR_EVENT_START_HOUR}) * var(--calendar-hour-row-height))`,
    height: `calc(var(${GRID.WEEKDAY_CSS_VAR_EVENT_DURATION_HOURS}) * var(--calendar-hour-row-height) - 2px)`,
  } as CalendarEventPositionStyle;
};

const AllDayEventChip = ({ event }: { event: GoogleCalendarEvent }) => {
  const tokens = generateColorTokens(event.accentColor);

  return (
    <div
      className={cn(eventChipAllDayClass, "truncate")}
      style={{ background: tokens.bg, color: tokens.text }}
      title={event.title || "Untitled"}
    >
      {event.title || "Untitled"}
    </div>
  );
};

const useCurrentTimeMinutes = (): number => {
  const getNow = () => {
    const d = new Date();
    return d.getHours() * GRID.WEEKDAY_MINUTES_PER_HOUR + d.getMinutes();
  };

  const [minutes, setMinutes] = useState(getNow);

  useEffect(() => {
    const now = new Date();

    const msUntilNextMinute =
      (GRID.WEEKDAY_SECONDS_PER_MINUTE - now.getSeconds()) *
        GRID.WEEKDAY_MS_PER_SECOND -
      now.getMilliseconds();

    let intervalId: number | null = null;

    const timeoutId = window.setTimeout(() => {
      setMinutes(getNow());

      intervalId = window.setInterval(() => {
        setMinutes(getNow());
      }, GRID.WEEKDAY_CURRENT_TIME_UPDATE_INTERVAL_MS);
    }, msUntilNextMinute);

    return () => {
      window.clearTimeout(timeoutId);

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return minutes;
};

type CurrentTimeLabelProps = {
  currentMinutes: number;
};

const CurrentTimeLabel = ({ currentMinutes }: CurrentTimeLabelProps) => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-0 z-30 flex h-9 w-full -translate-y-1/2 select-none items-center justify-end bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_0%,white_32%,white_68%,rgba(255,255,255,0)_100%)] pr-1 text-[12px] font-semibold leading-none tabular-nums text-[#3f7fc5]"
      style={{
        top: `calc(${currentMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(--calendar-hour-row-height))`,
      }}
    >
      {createMinuteLabel(currentMinutes)}
    </div>
  );
};

type CurrentTimeIndicatorProps = {
  isToday: boolean;
  currentMinutes: number;
};

const CurrentTimeIndicator = ({
  isToday,
  currentMinutes,
}: CurrentTimeIndicatorProps) => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-10"
      style={{
        top: `calc(${currentMinutes / GRID.WEEKDAY_MINUTES_PER_HOUR} * var(--calendar-hour-row-height))`,
      }}
    >
      <div
        style={{
          height: GRID.WEEKDAY_CURRENT_TIME_INDICATOR_HEIGHT,
          background: isToday ? COLOR.WEEKDAY_COLOR_PRIMARY : "transparent",
          borderTop: isToday
            ? "none"
            : `${GRID.WEEKDAY_CURRENT_TIME_INDICATOR_HEIGHT}px ${GRID.WEEKDAY_CURRENT_TIME_DASHED_STYLE} ${COLOR.WEEKDAY_COLOR_PRIMARY_SOFT}`,
        }}
      />
    </div>
  );
};

const areSameVisibleDays = (previous: Date[], next: Date[]) => {
  if (previous.length !== next.length) return false;

  return previous.every((day, index) => day.getTime() === next[index]?.getTime());
};

const isSelectionEquivalentForVisibleDays = (
  previousSelectedDate: Date,
  nextSelectedDate: Date,
  previousVisibleDays: Date[],
  nextVisibleDays: Date[],
) => {
  const previousSelectedKey = getCalendarDateKey(previousSelectedDate);
  const nextSelectedKey = getCalendarDateKey(nextSelectedDate);

  if (previousSelectedKey === nextSelectedKey) return true;

  const previousSelectionWasVisible = previousVisibleDays.some(
    (day) => getCalendarDateKey(day) === previousSelectedKey,
  );
  const nextSelectionIsVisible = nextVisibleDays.some(
    (day) => getCalendarDateKey(day) === nextSelectedKey,
  );

  return !previousSelectionWasVisible && !nextSelectionIsVisible;
};

export const CalendarWeekDayGrid = memo(function CalendarWeekDayGrid({
  headerScrollRef: _headerScrollRef,
  allDayScrollRef: _allDayScrollRef,
  scrollContainerRef,
  visibleDays,
  visibleEvents,
  _calendarDayColumnWidth,
  timelineGridStyle,
  onScroll,
  selectedDate,
  onSelectDate,
}: CalendarWeekDayGridProps) {
  const today = new Date();
  const currentMinutes = useCurrentTimeMinutes();

  const isTodayVisible = visibleDays.some((d) => isSameDay(d, today));
  const todayColumnIndex = visibleDays.findIndex((d) => isSameDay(d, today));

  const eventsByDay = useMemo(() => {
    const map = new Map<string, WeekdayDayEvents>();
    const visibleDayByKey = new Map(
      visibleDays.map((day) => {
        const key = getCalendarDateKey(day);
        map.set(key, {
          allDayEvents: [],
          timedEvents: [],
        });

        return [key, day] as const;
      }),
    );

    for (const event of visibleEvents) {
      for (const dayKey of getEventDateKeys(event)) {
        const day = visibleDayByKey.get(dayKey);
        const dayEvents = map.get(dayKey);

        if (!day || !dayEvents) continue;

        if (event.isAllDay) {
          dayEvents.allDayEvents.push(event);
          continue;
        }

        const clippedEvent = clipEventToDay(event, day);
        if (clippedEvent) {
          dayEvents.timedEvents.push(clippedEvent);
        }
      }
    }

    for (const dayEvents of map.values()) {
      dayEvents.allDayEvents.sort(compareCalendarEvents);
      dayEvents.timedEvents.sort(compareCalendarEvents);
    }

    return map;
  }, [visibleDays, visibleEvents]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
        onScroll={onScroll}
      >
        <div className="grid bg-white" style={timelineGridStyle}>
          <div className="sticky left-0 top-0 z-[60] h-10 border-b border-r border-[#eeeeee] bg-white" />

          {visibleDays.map((day, dayIndex) => {
            const isDayToday = isSameDay(day, today);
            const isDaySelected =
              !!selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={`weekday-header-${day.toISOString()}`}
                className={cn(
                  "sticky top-0 z-50 border-b border-r border-[#eeeeee] bg-white",
                  dayIndex === visibleDays.length - 1 && "border-r-0",
                )}
              >
                <CalendarDateButton
                  isToday={isDayToday}
                  isSelected={isDaySelected}
                  onClick={() => onSelectDate?.(day)}
                  className="w-full"
                >
                  <CalendarDateContent
                    dateLabel={format(day, GRID.WEEKDAY_DATE_FORMAT)}
                    weekdayLabel={format(day, GRID.WEEKDAY_DAY_FORMAT, {
                      locale: ja,
                    })}
                    isToday={isDayToday}
                    isSelected={isDaySelected}
                    layout="weekday-date"
                  />
                </CalendarDateButton>
              </div>
            );
          })}

          <div
            className="sticky left-0 top-10 z-[60] flex min-h-7 justify-end border-b border-r border-[#eeeeee] bg-white pr-2 pt-1 text-[10px] font-medium text-[rgba(60,60,67,0.45)]"
            style={{ width: C.TIME_COLUMN_WIDTH }}
          >
            終日
          </div>

          {visibleDays.map((day, dayIndex) => {
            const dayEvents =
              eventsByDay.get(getCalendarDateKey(day)) ?? EMPTY_WEEKDAY_DAY_EVENTS;
            const events = dayEvents.allDayEvents;
            const visibleChips = events.slice(0, MAX_ALL_DAY_VISIBLE_CHIPS);
            const overflowCount = events.length - visibleChips.length;

            return (
              <div
                key={`weekday-all-day-${day.toISOString()}`}
                className={cn(
                  "sticky top-10 z-40 min-h-7 border-b border-r border-[#eeeeee] bg-white px-1 py-1",
                  dayIndex === visibleDays.length - 1 && "border-r-0",
                )}
              >
                <div className="flex flex-col gap-1">
                  {visibleChips.map((event) => (
                    <AllDayEventChip key={event.id} event={event} />
                  ))}

                  {overflowCount > 0 ? (
                    <div className="text-[11px] font-medium text-[#8f929c]">
                      +{overflowCount}件
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          <div className="sticky left-0 z-30 overflow-hidden border-r border-[#eeeeee] bg-white shadow-[1px_0_0_rgba(255,255,255,0.88)_inset]">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative bg-white"
                style={{ height: "var(--calendar-hour-row-height)" }}
              >
                <span
                  className={cn(
                    "absolute bottom-0 right-1 z-10 flex h-6 translate-y-1/2 select-none items-center justify-end rounded-md bg-white px-1 text-[12px] font-medium tabular-nums",
                    "text-[#b3b3b3]",
                  )}
                >
                  {createHourLabel(hour)}
                </span>
              </div>
            ))}

            <CurrentTimeLabel currentMinutes={currentMinutes} />
          </div>

          {visibleDays.map((day, dayIndex) => {
            const isDayToday = isSameDay(day, today);
            const dayEvents =
              eventsByDay.get(getCalendarDateKey(day)) ?? EMPTY_WEEKDAY_DAY_EVENTS;
            const eventsForDay = dayEvents.timedEvents;

            const layout = computeEventLayout(
              eventsForDay.map((event) =>
                toLayoutEvent(
                  event.id,
                  new Date(event.startsAt),
                  Math.max(getEventDurationMinutes(event), MIN_LAYOUT_MINUTES),
                ),
              ),
            );

            return (
              <div
                key={`weekday-body-${day.toISOString()}`}
                className={cn(
                  "relative border-r border-[#eeeeee] bg-white",
                  dayIndex === visibleDays.length - 1 && "border-r-0",
                )}
              >
                {HOURS.map((hour) => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-b border-[#eeeeee] bg-white"
                    style={{ height: "var(--calendar-hour-row-height)" }}
                  />
                ))}

                {(isTodayVisible
                  ? isDayToday || todayColumnIndex !== -1
                  : true) && (
                  <CurrentTimeIndicator
                    isToday={isDayToday}
                    currentMinutes={currentMinutes}
                  />
                )}

                {eventsForDay.map((event) => {
                  const pos = layout.get(event.id) ?? { left: 0, width: 1 };

                  return (
                    <div
                      key={event.id}
                      className="absolute px-[2px]"
                      style={{
                        ...calculateEventPositionStyle(event),
                        left: `${pos.left * 100}%`,
                        width: `${pos.width * 100}%`,
                      }}
                    >
                      <CalendarEventChipWeekday event={event} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}, (previous, next) => {
  return (
    previous.scrollContainerRef === next.scrollContainerRef &&
    previous.visibleEvents === next.visibleEvents &&
    previous._calendarDayColumnWidth === next._calendarDayColumnWidth &&
    previous.timelineGridStyle === next.timelineGridStyle &&
    previous.onScroll === next.onScroll &&
    previous.onSelectDate === next.onSelectDate &&
    areSameVisibleDays(previous.visibleDays, next.visibleDays) &&
    isSelectionEquivalentForVisibleDays(
      previous.selectedDate,
      next.selectedDate,
      previous.visibleDays,
      next.visibleDays,
    )
  );
});
