import React, { useEffect, useState } from "react";

import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";

import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarWeekDayGridProps } from "@/features/calendar/calendarPane.types";
import {
  computeEventLayout,
  toLayoutEvent,
} from "@/features/calendar/eventchip/EventChip.layout.weekday.desktop";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";

import { CalendarEventChipWeekday } from "../eventchip/EventChip.weekday";

import { cn } from "@/lib/utils";

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
    top: "calc(var(--calendar-event-start-hour) * var(--calendar-hour-row-height))",
    height: "calc(var(--calendar-event-duration-hours) * var(--calendar-hour-row-height) - 2px)",
  };
};

// ─────────────────────────────────────────────────────────────
// 現在時刻フック
// 1分ごとに更新し、0時からの経過分数を返す
// ─────────────────────────────────────────────────────────────

const useCurrentTimeMinutes = (): number => {
  const getNow = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  const [minutes, setMinutes] = useState(getNow);

  useEffect(() => {
    // 次の「ちょうど1分」まで待ってから interval を開始することで
    // 時計と同期したタイミングで更新される
    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const initialTimer = window.setTimeout(() => {
      setMinutes(getNow());
      const id = window.setInterval(() => setMinutes(getNow()), 60_000);
      // setInterval の cleanup は返せないのでクロージャで保持
      return () => window.clearInterval(id);
    }, msUntilNextMinute);

    return () => window.clearTimeout(initialTimer);
  }, []);

  return minutes;
};

// ─────────────────────────────────────────────────────────────
// 現在時刻インジケーター
// ─────────────────────────────────────────────────────────────

type CurrentTimeIndicatorProps = {
  /** true のとき左端にドットを表示（今日の列、または最左列） */
  showDot: boolean;
  /** 0時からの経過分数 */
  currentMinutes: number;
};

const CurrentTimeIndicator = ({
  showDot,
  currentMinutes,
}: CurrentTimeIndicatorProps) => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{
        top: `calc(${currentMinutes / 60} * var(--calendar-hour-row-height))`,
      }}
    >
      {/* ドット（今日の列のみ） */}
      {showDot && (
        <span
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: -4,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#185FA5",
          }}
        />
      )}

      {/* 横線 */}
      <div
        style={{
          height: 1.5,
          background: "rgba(24, 95, 165, 0.55)",
          marginLeft: showDot ? 2 : 0,
        }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// メインコンポーネント
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

  // 表示範囲内に今日が含まれているか
  const isTodayVisible = visibleDays.some((d) => isSameDay(d, today));

  // 今日の列のインデックス（線の左端のドット位置を決めるため）
  const todayColumnIndex = visibleDays.findIndex((d) => isSameDay(d, today));

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
          {visibleDays.map((day: Date, colIndex: number) => {
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

            const isDayToday = isSameDay(day, today);

            // ドットは今日の列に表示。
            // 今日が表示範囲内にない場合は最左列にドットを出す（線だけでも視認しやすくするため）
            const showDot = isTodayVisible
              ? isDayToday
              : colIndex === 0;

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

                {/* ── 現在時刻インジケーター ── */}
                {(isTodayVisible ? isDayToday || todayColumnIndex !== -1 : true) && (
                  <CurrentTimeIndicator
                    showDot={showDot}
                    currentMinutes={currentMinutes}
                  />
                )}

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