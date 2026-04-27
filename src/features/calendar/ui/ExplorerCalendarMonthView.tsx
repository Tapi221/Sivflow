import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useMemo } from "react";

import {
  buildCalendarMonthGridDays,
  type CalendarMonthGridDay,
} from "@/features/calendar/model/monthGrid";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const getMonthAnnotation = (
  day: CalendarMonthGridDay,
  baseDate: Date,
): string | null => {
  if (day.isCurrentMonth || !day.isMonthStart) return null;

  const monthLabel = format(day.date, "M月", { locale: ja });
  const baseMonthLabel = format(baseDate, "M月", { locale: ja });

  return monthLabel === baseMonthLabel ? null : monthLabel;
};

type ExplorerCalendarMonthViewProps = {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export const ExplorerCalendarMonthView = ({
  currentDate,
  selectedDate,
  onSelectDate,
}: ExplorerCalendarMonthViewProps) => {
  const monthDays = useMemo(
    () => buildCalendarMonthGridDays(currentDate),
    [currentDate],
  );
  const today = useMemo(() => new Date(), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="grid h-[48px] shrink-0 grid-cols-7 border-b border-[#ebeae4] bg-white">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex items-center justify-center border-r border-[#f0efea] text-[13px] font-semibold text-[#9b9a94] last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 bg-white">
        {monthDays.map((day, index) => {
          const selected = isSameDay(day.date, selectedDate);
          const todayCell = isSameDay(day.date, today);
          const monthAnnotation = getMonthAnnotation(day, currentDate);
          const isLastColumn = index % 7 === 6;
          const isLastRow = index >= monthDays.length - 7;

          return (
            <button
              key={day.key}
              type="button"
              aria-label={format(day.date, "yyyy年M月d日", { locale: ja })}
              aria-pressed={selected}
              className={cn(
                "group relative min-h-[112px] overflow-hidden border-[#ebeae4] bg-white px-5 py-5 text-left outline-none transition-colors",
                !isLastColumn && "border-r",
                !isLastRow && "border-b",
                selected && "bg-[#fff9f8]",
                !selected && "hover:bg-[#fbfaf7]",
                "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              )}
              onClick={() => onSelectDate(day.date)}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-[15px] font-semibold tabular-nums transition-colors",
                    selected
                      ? "bg-[#ef5555] text-white shadow-[0_7px_18px_rgba(239,85,85,0.28)]"
                      : todayCell
                        ? "bg-[#f0efea] text-[#24231f]"
                        : day.isCurrentMonth
                          ? "text-[#24231f]"
                          : "text-[#b0aea8]",
                  )}
                >
                  {day.dayOfMonth}
                </span>

                {monthAnnotation ? (
                  <span className="pt-1 text-[12px] font-semibold text-[#a09f98]">
                    {monthAnnotation}
                  </span>
                ) : null}
              </div>

              {selected ? (
                <span
                  aria-hidden="true"
                  className="absolute left-5 right-5 top-[70px] h-[2px] rounded-full bg-[#f4b3b0]"
                />
              ) : null}

              {selected ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#fff1ef] to-transparent opacity-55"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
