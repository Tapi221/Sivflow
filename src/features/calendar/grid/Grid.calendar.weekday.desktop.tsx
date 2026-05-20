import React, { useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";

import * as C from "@/features/calendar/calendar.constants.desktop";
import * as GRID from "@/features/calendar/grid/grid.layout.constants.desktop";

import type { CalendarWeekDayGridProps } from "@/features/calendar/calendarPane.types";
import { computeEventLayout, toLayoutEvent } from "@/features/calendar/eventchip/EventChip.layout.weekday.desktop";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";

import { CalendarEventChipWeekday } from "../eventchip/EventChip.weekday";
import { cn } from "@/lib/utils";

type CalendarEventPositionStyle = React.CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

const HOURS = Array.from({ length: C.WEEKDAY_HOURS }, (_, index) => index);
const MIN_LAYOUT_MINUTES = C.MIN_LAYOUT_MINUTES;

const createHourLabel = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00`;

const calculateEventPositionStyle = (
  event: GoogleCalendarEvent,
): CalendarEventPositionStyle => {
  const startHour =
    event.startsAt.getHours() +
    event.startsAt.getMinutes() / C.WEEKDAY_MINUTES_PER_HOUR;

  return {
    "--calendar-event-start-hour": Math.max(0, startHour),
    "--calendar-event-duration-hours":
      event.minutes / C.WEEKDAY_MINUTES_PER_HOUR,
    top: `calc(var(${C.WEEKDAY_CSS_VAR_EVENT_START_HOUR}) * var(--calendar-hour-row-height))`,
    height: `calc(var(${C.WEEKDAY_CSS_VAR_EVENT_DURATION_HOURS}) * var(--calendar-hour-row-height) - 2px)`,
  };
};

// ─────────────────────────────────────────────────────────────
// 現在時刻フック
// ─────────────────────────────────────────────────────────────

const useCurrentTimeMinutes = (): number => {
  const getNow = () => {
    const d = new Date();
    return d.getHours() * C.WEEKDAY_MINUTES_PER_HOUR + d.getMinutes();
  };

  const [minutes, setMinutes] = useState(getNow);

  useEffect(() => {
    const now = new Date();

    const msUntilNextMinute =
      (C.WEEKDAY_SECONDS_PER_MINUTE - now.getSeconds()) *
        C.WEEKDAY_MS_PER_SECOND -
      now.getMilliseconds();

    const timeoutId = window.setTimeout(() => {
      setMinutes(getNow);

      const intervalId = window.setInterval(() => {
        setMinutes(getNow);
      }, C.WEEKDAY_CURRENT_TIME_UPDATE_INTERVAL_MS);

      return () => window.clearInterval(intervalId);
    }, msUntilNextMinute);

    return () => window.clearTimeout(timeoutId);
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
        top: `calc(${currentMinutes / C.WEEKDAY_MINUTES_PER_HOUR} * var(--calendar-hour-row-height))`,
      }}
    >
      <div
        style={{
          height: C.WEEKDAY_CURRENT_TIME_INDICATOR_HEIGHT,
          background: isToday
            ? GRID.WEEKDAY_COLOR_PRIMARY
            : "transparent",
          borderTop: isToday
            ? "none"
            : `${C.WEEKDAY_CURRENT_TIME_INDICATOR_HEIGHT}px ${C.WEEKDAY_CURRENT_TIME_DASHED_STYLE} ${GRID.WEEKDAY_COLOR_PRIMARY_SOFT}`,
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
  const todayColumnIndex = visibleDays.findIndex((d) =>
    isSameDay(d, today),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {/* ── ヘッダー ── */}
      <div className="flex shrink-0 border-b border-[#e5e7eb] bg-white">
        <div
          className="shrink-0 border-r border-[#e5e7eb]"
          style={{ width: C.TIME_COLUMN_WIDTH }}
        />

        <div ref={headerScrollRef} className="overflow-hidden flex-1">
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
                    isDayToday && `bg-[${GRID.WEEKDAY_COLOR_TODAY_BG}]`,
                    !isDayToday &&
                      isDaySelected &&
                      `bg-[${GRID.WEEKDAY_COLOR_HOVER_BG}]`,
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-none",
                      isDayToday || isDaySelected
                        ? `text-[${GRID.WEEKDAY_COLOR_TEXT_PRIMARY}]`
                        : `text-[${GRID.WEEKDAY_COLOR_TEXT_SECONDARY}]`,
                    )}
                  >
                    {format(day, C.WEEKDAY_DAY_FORMAT, { locale: ja })}
                  </span>

                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
                      isDayToday
                        ? `bg-[${GRID.WEEKDAY_COLOR_PRIMARY}] text-white shadow-[0_2px_8px_rgba(24,95,165,0.35)]`
                        : isDaySelected
                          ? `bg-[${GRID.WEEKDAY_COLOR_SELECTED_BG}] text-white`
                          : `text-[${GRID.WEEKDAY_COLOR_TEXT_PRIMARY}]`,
                    )}
                  >
                    {format(day, C.WEEKDAY_DATE_FORMAT)}
                  </span>
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
                className="relative border-b border-[#eef0f3] bg-white"
                style={{ height: "var(--calendar-hour-row-height)" }}
              >
                {hour > 0 && (
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 z-10 translate-y-1/2 select-none bg-white pl-1 text-[11px] font-medium leading-none tabular-nums",
                      `text-[${GRID.WEEKDAY_COLOR_TEXT_MUTED}]`,
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
                !event.isAllDay && isSameDay(event.startsAt, day),
            );

            const layout = computeEventLayout(
              eventsForDay.map((event) =>
                toLayoutEvent(
                  event.id,
                  event.startsAt,
                  Math.max(event.minutes, MIN_LAYOUT_MINUTES),
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
                  const pos = layout.get(event.id) ?? {
                    left: 0,
                    width: 1,
                  };

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