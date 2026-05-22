import React, { useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { CalendarDayNumberCircle } from "@/features/calendar/dayNumber/CalendarDayNumberCircle";
import * as COLOR from "@/features/calendar/grid/grid.color.constants.desktop";
import * as GRID from "@/features/calendar/grid/grid.layout.constants.desktop";
import type { CalendarWeekDayGridProps } from "@/features/calendar/schedulePane.types";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import { computeEventLayout,toLayoutEvent } from "@/features/calendar/eventchip/EventChip.layout.weekday.desktop";
import { CalendarEventChipWeekday } from "../eventchip/EventChip.schedule.weekday";
import { cn } from "@/lib/utils";
// ==============================================

type CalendarEventPositionStyle = React.CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

const HOURS = Array.from({ length: GRID.WEEKDAY_HOURS }, (_, index) => index);
const MIN_LAYOUT_MINUTES = C.MIN_LAYOUT_MINUTES;

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

// ─────────────────────────────────────────────────────────────
// 現在時刻フック
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// 現在時刻インジケーター
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────────────────────

export const CalendarWeekDayGrid = ({
  headerScrollRef,
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

  const isTodayVisible = visibleDays.some((d) => isSameDay(d, today));
  const todayColumnIndex = visibleDays.findIndex((d) => isSameDay(d, today));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {/* ── ヘッダー ── */}
      <div className="flex shrink-0 border-b border-[#e5e7eb] bg-white">
        <div
          className="shrink-0 border-r border-[#e5e7eb]"
          style={{ width: C.TIME_COLUMN_WIDTH }}
        />

        <div ref={headerScrollRef} className="flex-1 overflow-hidden">
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
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelectDate?.(day)}
                  className={cn(
                    "flex h-10 shrink-0 flex-col items-center justify-center border-r border-[#eef0f3] last:border-r-0",
                    "transition-colors hover:bg-[#f4f5f7]",
                    "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    isDayToday && "bg-[#f0f6ff]",
                    !isDayToday && isDaySelected && "bg-[#f4f5f7]",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-none",
                      isDayToday || isDaySelected
                        ? "text-[#24231f]"
                        : "text-[#8f929c]",
                    )}
                  >
                    {format(day, GRID.WEEKDAY_DAY_FORMAT, { locale: ja })}
                  </span>

                  <CalendarDayNumberCircle
                    isToday={isDayToday}
                    isSelected={isDaySelected}
                    className="mt-0.5"
                  >
                    {format(day, GRID.WEEKDAY_DATE_FORMAT)}
                  </CalendarDayNumberCircle>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 本体 ── */}
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
        onScroll={onScroll}
      >
        <div className="grid" style={timelineGridStyle}>
          {/* 時刻列 */}
          <div className="sticky left-0 z-20 border-r border-[#e5e7eb] bg-white">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative bg-white"
                style={{ height: "var(--calendar-hour-row-height)" }}
              >
                {hour > 0 && (
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 z-10 flex h-6 translate-y-1/2 select-none items-center justify-end bg-white pl-1 text-[12px] font-semibold tabular-nums",
                      "text-[#b8bcc5]",
                    )}
                  >
                    {createHourLabel(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 日別カラム */}
          {visibleDays.map((day) => {
            const isDayToday = isSameDay(day, today);

            const eventsForDay = visibleEvents.filter(
              (event) =>
                !event.isAllDay && isSameDay(new Date(event.startsAt), day),
            );

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
                className="relative border-r border-[#eef0f3] last:border-r-0"
              >
                {HOURS.map((hour) => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-b border-[#eef0f3]"
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