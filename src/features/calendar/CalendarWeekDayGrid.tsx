import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";

import { cn } from "@/lib/utils";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { generateColorTokens } from "@/features/calendar/calendar.color-tokens";
import {
  computeEventLayout,
  toLayoutEvent,
} from "@/features/calendar/calendarEventLayout";
import type { GoogleCalendarEvent } from "@/features/calendar/hooks/useGoogleCalendarIntegration";
import type {
  CalendarEventLabelStyle,
  CalendarWeekDayGridProps,
} from "./calendarPane.types";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MIN_LAYOUT_MINUTES = C.MIN_LAYOUT_MINUTES;

const createHourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

// borderLeft 関連を除去し、アクセントバーは JSX 側で描画する
const calculateEventStyle = (
  event: GoogleCalendarEvent,
): Omit<CalendarEventLabelStyle, "borderLeftColor" | "borderLeftStyle" | "borderLeftWidth"> => {
  const startHour =
    event.startsAt.getHours() + event.startsAt.getMinutes() / 60;
  const tokens = generateColorTokens(event.accentColor);
  return {
    "--calendar-event-start-hour": Math.max(0, startHour - HOURS[0]),
    "--calendar-event-duration-hours": event.minutes / 60,
    top: `calc(var(--calendar-event-start-hour) * var(--calendar-hour-row-height))`,
    height: `calc(var(--calendar-event-duration-hours) * var(--calendar-hour-row-height) - 2px)`,
    backgroundColor: tokens.bg,
    color: tokens.text,
  };
};

const createEventTimeLabel = (event: GoogleCalendarEvent) => {
  const endsAt = new Date(event.startsAt.getTime() + event.minutes * 60_000);
  return `${format(event.startsAt, "H:mm")} ~ ${format(endsAt, "H:mm")}`;
};

export const CalendarWeekDayGrid = ({
  headerScrollRef,
  scrollContainerRef,
  visibleDays,
  visibleEvents,
  calendarDayColumnWidth,
  timelineGridStyle,
  onScroll,
}: CalendarWeekDayGridProps) => {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {/* ── 日付ヘッダー（縦スクロールに追従しない固定行） ── */}
      <div className="flex shrink-0 border-b border-[#e5e7eb] bg-white">
        <div
          className="shrink-0 border-r border-[#e5e7eb] bg-white"
          style={{ width: C.TIME_COLUMN_WIDTH }}
        />
        {/* JS で scrollLeft を本体と同期するため overflow-hidden */}
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
            {visibleDays.map((day) => {
              const isDayToday = isSameDay(day, new Date());
              return (
                <div
                  key={`${day.toISOString()}-header`}
                  className={cn(
                    "flex h-10 shrink-0 flex-col items-center justify-center border-r border-[#eef0f3] last:border-r-0",
                    isDayToday && "bg-[#f0f6ff]",
                  )}
                >
                  <span className="text-[11px] font-medium leading-none text-[#8f929c]">
                    {format(day, "E", { locale: ja })}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
                      isDayToday ? "bg-[#185FA5] text-white" : "text-[#24231f]",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── スクロール可能な本体（時刻ラベル + イベントグリッド） ── */}
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
        onScroll={onScroll}
      >
        <div className="grid" style={timelineGridStyle}>
          {/* 時刻ラベル列（左固定） */}
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

          {/* 各日付列 */}
          {visibleDays.map((day) => {
            const eventsForDay = visibleEvents.filter((e) =>
              isSameDay(e.startsAt, day),
            );
            const layout = computeEventLayout(
              eventsForDay.map((e) =>
                toLayoutEvent(
                  e.id,
                  e.startsAt,
                  Math.max(e.minutes, MIN_LAYOUT_MINUTES),
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

                {eventsForDay.map((event) => {
                  const pos = layout.get(event.id) ?? { left: 0, width: 1 };
                  const tokens = generateColorTokens(event.accentColor);

                  return (
                    <div
                      key={event.id}
                      className="absolute min-h-12 overflow-hidden rounded pl-[10px] pr-[6px] py-1 text-[12px] font-medium leading-[1.35]"
                      style={{
                        ...calculateEventStyle(event),
                        left: `calc(${pos.left * 100}% + 2px)`,
                        width: `calc(${pos.width * 100}% - 4px)`,
                        right: "unset",
                      }}
                    >
                      {/* 月表示チップと同じカーブ感のアクセントバー */}
                      <span
                        className="absolute left-[3px] top-[6px] bottom-[6px] w-[3px] rounded-full"
                        style={{ backgroundColor: tokens.border }}
                      />

                      <div className="truncate text-[11px] font-medium leading-[1.25] opacity-90">
                        {createEventTimeLabel(event)}
                      </div>
                      <div className="line-clamp-2 break-words">
                        {event.title}
                      </div>
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