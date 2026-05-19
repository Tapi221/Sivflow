import React from "react";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

import * as C from "@/features/calendar/calendar.constants.desktop";
import {
  computeEventLayout,
  toLayoutEvent,
} from "@/features/calendar/eventchip/EventChip.layout.weekday.desktop";

import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import type { CalendarWeekDayGridProps } from "@/features/calendar/calendarPane.types";

import { CalendarEventChipWeekday } from "../eventchip/EventChip.weekday";

type CalendarEventPositionStyle = React.CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MIN_LAYOUT_MINUTES = C.MIN_LAYOUT_MINUTES;

const createHourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const calculateEventPositionStyle = (
  event: GoogleCalendarEvent,
): CalendarEventPositionStyle => {
  const startHour =
    event.startsAt.getHours() + event.startsAt.getMinutes() / 60;

  return {
    "--calendar-event-start-hour": Math.max(0, startHour - HOURS[0]),
    "--calendar-event-duration-hours": event.minutes / 60,
    top: `calc(var(--calendar-event-start-hour) * var(--calendar-hour-row-height))`,
    height: `calc(var(--calendar-event-duration-hours) * var(--calendar-hour-row-height) - 2px)`,
  };
};

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {/* ── 日付ヘッダー ── */}
      <div className="flex shrink-0 border-b border-[#e5e7eb] bg-white">
        <div
          className="shrink-0 border-r border-[#e5e7eb] bg-white"
          style={{ width: C.TIME_COLUMN_WIDTH }}
        />

        <div
          ref={headerScrollRef}
          className="overflow-hidden"
          style={{ flex: 1 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${visibleDays.length}, ${calendarDayColumnWidth}px)`,
              minWidth: `${visibleDays.length * calendarDayColumnWidth}px`,
            }}
          >
            {visibleDays.map((day: Date) => {
              const isDayToday = isSameDay(day, today);
              const isDaySelected =
                !!selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={`${day.toISOString()}-header`}
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
                    {format(day, "E", { locale: ja })}
                  </span>

                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
                      isDayToday
                        ? "bg-[#185FA5] text-white shadow-[0_2px_8px_rgba(24,95,165,0.35)]"
                        : isDaySelected
                          ? "bg-[#2d3039] text-white"
                          : "text-[#24231f]",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── スクロール本体 ── */}
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
                key={`time-${hour}`}
                className="relative border-b border-[#eef0f3] bg-white"
                style={{ height: "var(--calendar-hour-row-height)" }}
              >
                {hour > 0 && (
                  <span className="absolute bottom-0 right-0 z-10 translate-y-1/2 select-none bg-white pr-2.5 pl-1 text-[11px] font-medium leading-none tabular-nums text-[#b0b4be]">
                    {createHourLabel(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 日ごとの列 */}
          {visibleDays.map((day: Date) => {
            const eventsForDay = visibleEvents.filter(
              (event: GoogleCalendarEvent) =>
                !event.isAllDay && isSameDay(event.startsAt, day),
            );

            const layout = computeEventLayout(
              eventsForDay.map((event: GoogleCalendarEvent) =>
                toLayoutEvent(
                  event.id,
                  event.startsAt,
                  Math.max(event.minutes, MIN_LAYOUT_MINUTES),
                ),
              ),
            );

            return (
              <div
                key={`${day.toISOString()}-column`}
                className="relative border-r border-[#eef0f3] last:border-r-0"
              >
                {HOURS.map((hour) => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-b border-[#eef0f3]"
                    style={{ height: "var(--calendar-hour-row-height)" }}
                  />
                ))}

                {eventsForDay.map((event: GoogleCalendarEvent) => {
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
