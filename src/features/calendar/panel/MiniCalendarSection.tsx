import { memo, useMemo } from "react";
import { addDays, format, isSameDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

type MiniCalendarSectionProps = {
  monthDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

const MINI_CALENDAR_DIVIDER_CLASS_NAME = "mt-2 h-px w-full shrink-0 bg-[#eeeeee]";
const MINI_CALENDAR_WEEKDAY_CLASS_NAME = "flex h-7 items-center justify-center text-[13px] font-extrabold text-[#858a93]";
const MINI_CALENDAR_DAY_BUTTON_CLASS_NAME = "group flex h-8 w-full items-center justify-center rounded-full transition-all duration-150 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dde5ea]";
const MINI_CALENDAR_DAY_BADGE_CLASS_NAME = "flex h-8 w-8 items-center justify-center rounded-full text-[18px] font-medium leading-none tabular-nums transition-all duration-150";

const buildMiniCalendarDays = (
  monthDate: Date,
  selectedDate: Date,
): MiniCalendarDay[] => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const today = startOfDay(new Date());

  return Array.from({ length: C.MINI_CALENDAR_CELL_COUNT }, (_, index) => {
    const date = addDays(gridStart, index);

    return {
      date,
      dayNumber: format(date, "d"),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isSelected: isSameDay(date, selectedDate),
      isToday: isSameDay(date, today),
      isRangeStart: false,
      isRangeEnd: false,
      isInSelectedRange: false,
    };
  });
};

const isSameDayValue = (left: Date, right: Date): boolean => {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
};

const isSameMonthValue = (left: Date, right: Date): boolean => {
  return startOfMonth(left).getTime() === startOfMonth(right).getTime();
};

const MiniCalendarSectionBase = ({
  monthDate,
  selectedDate,
  onSelectDate,
}: MiniCalendarSectionProps) => {
  const t = useT();
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );

  return (
    <>
      <section className="flex w-full shrink-0 flex-col pb-2.5 pl-0 pr-2.5 pt-2.5">
        <div className="grid grid-cols-7 px-0.5">
          {t.miniCalendarWeekdays.map((weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              className={MINI_CALENDAR_WEEKDAY_CLASS_NAME}
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 px-0.5">
          {miniCalendarDays.map((day) => {
            const isActive = day.isToday || day.isSelected;

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className={MINI_CALENDAR_DAY_BUTTON_CLASS_NAME}
              >
                <span
                  className={cn(
                    MINI_CALENDAR_DAY_BADGE_CLASS_NAME,
                    day.isToday && "bg-[#fde5e1] text-[#2f343b]",
                    day.isSelected && !day.isToday && "bg-[#ecebfb] text-[#2f343b]",
                    day.isCurrentMonth && !isActive && "bg-[#edf8fa] text-[#2f343b] group-hover:bg-[#e6f3f5]",
                    !day.isCurrentMonth && !isActive && "text-[#b8bec6] group-hover:bg-[#f4fafb]",
                  )}
                >
                  {day.dayNumber}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className={MINI_CALENDAR_DIVIDER_CLASS_NAME} />
    </>
  );
};

const MiniCalendarSection = memo(MiniCalendarSectionBase, (previous, next) => {
  return (
    isSameMonthValue(previous.monthDate, next.monthDate) &&
    isSameDayValue(previous.selectedDate, next.selectedDate) &&
    previous.onSelectDate === next.onSelectDate
  );
});

MiniCalendarSection.displayName = "MiniCalendarSection";

export { MiniCalendarSection };
