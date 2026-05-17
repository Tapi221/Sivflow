import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useMemo, useRef } from "react";

import { cn } from "@/lib/utils";
import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";

import { useMonthInfiniteScroll } from "./useMonthInfiniteScroll";
import { useMonthRowResize } from "./useMonthRowResize";

const getMonthAnnotation = (date: Date): string | null => {
  if (date.getDate() !== 1) return null;
  return format(date, "M月", { locale: ja });
};

type CalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  scrollTargetToken?: number;
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
};

export const CalendarMonthView = ({
  currentDate,
  selectedDate,
  scrollTargetToken = 0,
  onSelectDate,
  onVisibleMonthChange,
}: CalendarMonthViewProps) => {
  const today = useMemo(() => new Date(), []);

  // リサイズ中フラグを両フック間で共有
  const isResizingRef = useRef(false);

  const scroll = useMonthInfiniteScroll({
    currentDate,
    scrollTargetToken,
    isResizingRef,
    onVisibleMonthChange,
  });

  const resize = useMonthRowResize({
    scrollContainerRef: scroll.scrollContainerRef,
    weekRowRefsMap: scroll.weekRowRefsMap,
    monthWeeks: scroll.monthWeeks,
    isResizingRef,
    onAfterCommit: scroll.syncVisibleMonth,
  });

  return (
    <div
      ref={resize.rootRef}
      className="calendar-month-view flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      style={resize.monthViewStyle}
    >
      <div
        ref={scroll.scrollContainerRef}
        className="calendar-month-scroll min-h-0 flex-1 overflow-y-auto bg-white"
        onScroll={scroll.handleScroll}
      >
        {/* 曜日ヘッダー */}
        <div className="sticky top-0 z-20 grid h-8 grid-cols-7 border-b border-[#e5e7eb] bg-white">
          {T.WEEKDAY_LABELS.map((label: string) => (
            <div
              key={label}
              className="flex items-center justify-center border-r border-[#eef0f3] text-[12px] font-medium leading-normal text-[#8f929c] last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>

        {/* 月グリッド */}
        <div className="bg-white">
          {scroll.monthWeeks.map((week) => (
            <div
              key={week.key}
              ref={(node) => scroll.setWeekRowRef(week.key, node)}
              data-calendar-week-key={week.key}
              className="grid grid-cols-7 bg-white"
            >
              {week.days.map((day, index) => {
                const selected = isSameDay(day.date, selectedDate);
                const isToday = isSameDay(day.date, today);
                const monthAnnotation = getMonthAnnotation(day.date);
                const isLastColumn = index % 7 === 6;

                return (
                  <div
                    key={day.key}
                    className={cn(
                      "calendar-month-day-cell group relative h-[var(--calendar-month-row-height)] min-h-[var(--calendar-month-row-height)] overflow-visible border-b border-[#eef0f3] bg-white text-left transition-colors",
                      !isLastColumn && "border-r",
                      isToday && "bg-[#f4f8f1]",
                      selected && !isToday && "bg-[#fbfaf7]",
                      !selected && !isToday && "hover:bg-[#fbfaf7]",
                    )}
                  >
                    <button
                      type="button"
                      aria-label={format(day.date, "yyyy年M月d日", { locale: ja })}
                      aria-pressed={selected}
                      className="relative h-full w-full overflow-hidden text-left outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onClick={() => onSelectDate(day.date)}
                    >
                      <span
                        className={cn(
                          "absolute left-4 top-4 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[length:var(--ds-layout-font-size-meta)] font-semibold tabular-nums transition-colors",
                          isToday
                            ? "bg-[#6A876E] text-white shadow-[0_7px_18px_rgba(106,135,110,0.24)]"
                            : selected
                              ? "bg-[#f0efea] text-[#24231f] ring-1 ring-[#d8d6ce]"
                              : day.isCurrentMonth
                                ? "text-[#24231f]"
                                : "text-[#b0aea8]",
                        )}
                      >
                        {day.dayOfMonth}
                      </span>

                      {monthAnnotation ? (
                        <span className="absolute right-4 top-[18px] text-[12px] font-semibold text-[#a09f98]">
                          {monthAnnotation}
                        </span>
                      ) : null}
                    </button>

                    <div
                      role="separator"
                      aria-label={T.MONTH_ROW_RESIZE_ARIA_LABEL}
                      aria-orientation="horizontal"
                      aria-valuemin={C.MIN_MONTH_ROW_HEIGHT}
                      aria-valuemax={C.MAX_MONTH_ROW_HEIGHT}
                      aria-valuenow={resize.monthRowHeight}
                      tabIndex={0}
                      className="calendar-month-row-boundary-resize-handle"
                      title={T.MONTH_ROW_RESIZE_TITLE}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={resize.handleResizeReset}
                      onKeyDown={resize.handleResizeKeyDown}
                      onPointerDown={resize.handleResizePointerDown}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};