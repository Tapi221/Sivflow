import React, { useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import * as C from "@/features/calendar/calendar.constants.desktop";
import {
  clipEventToDay,
  eventOverlapsDay,
} from "@/features/calendar/calendarEventRange";
import { eventChipAllDayClass } from "@/chip/eventchip/eventchip.allday.styles";
import { computeEventLayout, toLayoutEvent } from "@/chip/eventchip/EventChip.layout.weekday.desktop";
import * as COLOR from "@/features/calendar/grid/grid.color.constants.desktop";
import * as GRID from "@/features/calendar/grid/grid.layout.constants.desktop";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import type { CalendarWeekDayGridProps } from "@/features/calendar/schedulePane.types";
import { generateColorTokens } from "@/features/calendar/schedule.color-tokens";

import { CalendarEventChipWeekday } from "../../../chip/eventchip/EventChip.schedule.weekday";
import {
  CalendarDateHeaderButton,
  CalendarDateHeaderDayContent,
} from "../../../chip/button/CalendarDateHeaderButton";
import { cn } from "@/lib/utils";

type CalendarEventPositionStyle = React.CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

const HOURS = Array.from({ length: GRID.WEEKDAY_HOURS }, (_, index) => index);
const MIN_LAYOUT_MINUTES = C.MIN_LAYOUT_MINUTES;
const MAX_ALL_DAY_VISIBLE_CHIPS = 3;

const createHourLabel = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00`;

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
  const durationMinutes = getEventDurationMinutes(event);

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
      className="pointer-events-none absolute inset-x-0 z-20"
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

export const CalendarWeekDayGrid = ({
  headerScrollRef,
  allDayScrollRef,
  scrollContainerRef,
  visibleDays,
  visibleEvents,
  calendarDayColumnWidth,
  timelineGridStyle,
  onScroll,
  selectedDate,
  onSelectDate,
}: CalendarWeekDayGridProps) => {
  const today = new Date();
  const currentMinutes = useCurrentTimeMinutes();
  const fallbackAllDayScrollRef = React.useRef<HTMLDivElement | null>(null);
  const resolvedAllDayScrollRef = allDayScrollRef ?? fallbackAllDayScrollRef;

  const isTodayVisible = visibleDays.some((d) => isSameDay(d, today));
  const todayColumnIndex = visibleDays.findIndex((d) => isSameDay(d, today));

  const allDayEventsByDay = useMemo(() => {
    return new Map(
      visibleDays.map((day) => [
        day.toISOString(),
        visibleEvents.filter(
          (event) => event.isAllDay && eventOverlapsDay(event, day),
        ),
      ]),
    );
  }, [visibleDays, visibleEvents]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 border-b border-[#eeeeee] bg-white">
        <div
          className="shrink-0 border-r border-[#eeeeee] bg-white"
          style={{ width: C.TIME_COLUMN_WIDTH }}
        />

        <div ref={headerScrollRef} className="flex-1 overflow-hidden bg-white">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${visibleDays.length}, ${calendarDayColumnWidth}px)`,
              minWidth: `${visibleDays.length * calendarDayColumnWidth}px`,
            }}
          >
            {visibleDays.map((day) => {
              const isDayToday = isSameDay(day, today);
              const isDaySelected =
                !!selectedDate && isSameDay(day, selectedDate);

              return (
                <CalendarDateHeaderButton
                  key={day.toISOString()}
                  isToday={isDayToday}
                  isSelected={isDaySelected}
                  onClick={() => onSelectDate?.(day)}
                >
                  <CalendarDateHeaderDayContent
                    dateLabel={format(day, GRID.WEEKDAY_DATE_FORMAT)}
                    weekdayLabel={format(day, GRID.WEEKDAY_DAY_FORMAT, {
                      locale: ja,
                    })}
                    isToday={isDayToday}
                    isSelected={isDaySelected}
                    layout="weekday-date"
                  />
                </CalendarDateHeaderButton>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 border-b border-[#eeeeee] bg-white">
        <div
          className="flex shrink-0 justify-end border-r border-[#eeeeee] bg-white pr-2 pt-1 text-[10px] font-medium text-[rgba(60,60,67,0.45)]"
          style={{ width: C.TIME_COLUMN_WIDTH }}
        >
          終日
        </div>

        <div
          ref={resolvedAllDayScrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden bg-white scrollbar-hidden"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${visibleDays.length}, ${calendarDayColumnWidth}px)`,
              minWidth: `${visibleDays.length * calendarDayColumnWidth}px`,
            }}
          >
            {visibleDays.map((day) => {
              const events = allDayEventsByDay.get(day.toISOString()) ?? [];
              const visibleChips = events.slice(0, MAX_ALL_DAY_VISIBLE_CHIPS);
              const overflowCount = events.length - visibleChips.length;

              return (
                <div
                  key={day.toISOString()}
                  className="min-h-7 border-r border-[#eeeeee] px-1 py-1 last:border-r-0"
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
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
        onScroll={onScroll}
      >
        <div className="grid bg-white" style={timelineGridStyle}>
          <div className="sticky left-0 z-20 border-r border-[#eeeeee] bg-white shadow-[1px_0_0_rgba(255,255,255,0.88)_inset]">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative bg-white"
                style={{ height: "var(--calendar-hour-row-height)" }}
              >
                <span
                  className={cn(
                    "absolute bottom-0 right-1 z-10 flex h-6 translate-y-1/2 select-none items-center justify-end rounded-md bg-white px-1 text-[12px] font-semibold tabular-nums",
                    "text-[#b3b3b3]",
                  )}
                >
                  {createHourLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          {visibleDays.map((day) => {
            const isDayToday = isSameDay(day, today);

            const eventsForDay = visibleEvents
              .filter(
                (event) => !event.isAllDay && eventOverlapsDay(event, day),
              )
              .map((event) => clipEventToDay(event, day))
              .filter((event): event is GoogleCalendarEvent => Boolean(event));

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
                key={day.toISOString()}
                className="relative border-r border-[#eeeeee] bg-white last:border-r-0"
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
};