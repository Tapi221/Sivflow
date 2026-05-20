import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";

import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";
import { CalendarEventChipMonth } from "@/features/calendar/eventchip/EventChip.month";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/useGoogleCalendarIntegration";
import * as GD from "@/features/calendar/grid/grid.layout.constants.desktop";

import { cn } from "@/lib/utils";

const getMonthAnnotation = (
  date: Date,
): string | null => {
  if (date.getDate() !== 1)
    return null;

  return format(date, "M月", {
    locale: ja,
  });
};

type CalendarMonthGridDay = {
  date: Date;
  key: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};

type CalendarMonthGridWeek = {
  key: string;
  days: CalendarMonthGridDay[];
};

type GridCalendarMonthDesktopProps = {
  today: Date;
  selectedDate: Date;
  visibleEvents: GoogleCalendarEvent[];
  monthWeeks: CalendarMonthGridWeek[];
  maxVisibleChips: number;
  monthRowHeight: number;
  setWeekRowRef: (
    key: string,
    node: HTMLDivElement | null,
  ) => void;
  onSelectDate: (
    date: Date,
  ) => void;
  handleResizeReset: () => void;
  handleResizeKeyDown: (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => void;
  handleResizePointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
  ) => void;
};

export const GridCalendarMonthDesktop = ({
  today,
  selectedDate,
  visibleEvents,
  monthWeeks,
  maxVisibleChips,
  monthRowHeight,
  setWeekRowRef,
  onSelectDate,
  handleResizeReset,
  handleResizeKeyDown,
  handleResizePointerDown,
}: GridCalendarMonthDesktopProps) => {
  const normalizedEvents =
    visibleEvents.map((e) => ({
      ...e,
      startsAt: new Date(e.startsAt),
    }));

  return (
    <>
      {/* 曜日ヘッダー */}
      <div
        className={cn(
          "sticky top-0 z-20 grid grid-cols-7 border-b border-[#e5e7eb] bg-white",
          GD.MONTH_GRID_WEEKDAY_HEADER_HEIGHT_CLASS,
        )}
      >
        {T.WEEKDAY_LABELS.map(
          (label: string) => (
            <div
              key={label}
              className="
                flex
                items-center
                justify-center
                border-r
                border-[#eef0f3]
                text-[12px]
                leading-normal
                font-medium
                text-[#8f929c]
                last:border-r-0
              "
            >
              {label}
            </div>
          ),
        )}
      </div>

      {/* 月グリッド */}
      <div className="bg-white">
        {monthWeeks.map((week) => (
          <div
            key={week.key}
            ref={(node) =>
              setWeekRowRef(
                week.key,
                node,
              )
            }
            data-calendar-week-key={
              week.key
            }
            className="
              grid
              grid-cols-7
              bg-white
            "
          >
            {week.days.map(
              (day, index) => {
                const selected =
                  isSameDay(
                    day.date,
                    selectedDate,
                  );

                const isToday =
                  isSameDay(
                    day.date,
                    today,
                  );

                const monthAnnotation =
                  getMonthAnnotation(
                    day.date,
                  );

                const isLastColumn =
                  index % 7 === 6;

                const sortedEvents =
                  normalizedEvents
                    .filter((e) =>
                      isSameDay(
                        e.startsAt,
                        day.date,
                      ),
                    )
                    .sort(
                      (a, b) =>
                        a.startsAt.getTime() -
                        b.startsAt.getTime(),
                    );

                const visibleChips =
                  sortedEvents.slice(
                    0,
                    maxVisibleChips,
                  );

                const overflowCount =
                  sortedEvents.length -
                  visibleChips.length;

                return (
                  <div
                    key={day.key}
                    className={cn(
                      "calendar-month-day-cell group relative h-[var(--calendar-month-row-height)] min-h-[var(--calendar-month-row-height)] overflow-visible border-b border-[#eef0f3] bg-white text-left transition-colors",
                      !isLastColumn &&
                        "border-r",
                      isToday &&
                        "bg-[#f0f6ff]",
                      selected &&
                        !isToday &&
                        "bg-[#f4f5f7]",
                      !selected &&
                        !isToday &&
                        "hover:bg-[#eceef1]",
                    )}
                  >
                    <button
                      type="button"
                      aria-label={format(
                        day.date,
                        "yyyy年M月d日",
                        {
                          locale: ja,
                        },
                      )}
                      aria-pressed={
                        selected
                      }
                      className="
                        relative
                        h-full
                        w-full
                        overflow-hidden
                        text-left
                        outline-none
                        focus-visible:z-10
                        focus-visible:ring-2
                        focus-visible:ring-inset
                        focus-visible:ring-ring
                      "
                      onClick={() =>
                        onSelectDate(
                          day.date,
                        )
                      }
                    >
                      {/* 日付 */}
                      <span
                        className={cn(
                          "absolute inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[length:var(--ds-layout-font-size-meta)] font-semibold tabular-nums transition-colors",
                          GD.MONTH_GRID_DAY_NUMBER_POSITION_CLASS,
                          isToday
                            ? "bg-[#185FA5] text-white shadow-[0_7px_18px_rgba(24,95,165,0.22)]"
                            : selected
                              ? "bg-[#2d3039] text-white"
                              : day.isCurrentMonth
                                ? "text-[#24231f]"
                                : "text-[#b0aea8]",
                        )}
                      >
                        {day.dayOfMonth}
                      </span>

                      {/* 月初ラベル */}
                      {monthAnnotation && (
                        <span
                          className={cn(
                            "absolute text-[12px] font-semibold text-[#a09f98]",
                            GD.MONTH_GRID_MONTH_ANNOTATION_POSITION_CLASS,
                          )}
                        >
                          {
                            monthAnnotation
                          }
                        </span>
                      )}

                      {/* イベント */}
                      {sortedEvents.length >
                        0 && (
                        <div
                          className={cn(
                            "absolute flex flex-col",
                            GD.MONTH_GRID_EVENTS_CONTAINER_POSITION_CLASS,
                            GD.MONTH_GRID_EVENTS_GAP_CLASS,
                          )}
                        >
                          {visibleChips.map(
                            (
                              event,
                            ) => (
                              <CalendarEventChipMonth
                                key={
                                  event.id
                                }
                                event={
                                  event
                                }
                              />
                            ),
                          )}

                          {overflowCount >
                            0 && (
                            <div
                              className={cn(
                                "font-medium text-[#8f929c]",
                                GD.MONTH_GRID_OVERFLOW_TEXT_CLASS,
                              )}
                            >
                              +
                              {
                                overflowCount
                              }
                              件
                            </div>
                          )}
                        </div>
                      )}
                    </button>

                    {/* リサイズ */}
                    <div
                      role="separator"
                      aria-label={
                        T.MONTH_ROW_RESIZE_ARIA_LABEL
                      }
                      aria-orientation="horizontal"
                      aria-valuemin={
                        C.MIN_MONTH_ROW_HEIGHT
                      }
                      aria-valuemax={
                        C.MAX_MONTH_ROW_HEIGHT
                      }
                      aria-valuenow={Number(
                        monthRowHeight,
                      )}
                      tabIndex={0}
                      className="calendar-month-row-boundary-resize-handle"
                      title={
                        T.MONTH_ROW_RESIZE_TITLE
                      }
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                      onDoubleClick={
                        handleResizeReset
                      }
                      onKeyDown={
                        handleResizeKeyDown
                      }
                      onPointerDown={
                        handleResizePointerDown
                      }
                    />
                  </div>
                );
              },
            )}
          </div>
        ))}
      </div>
    </>
  );
};