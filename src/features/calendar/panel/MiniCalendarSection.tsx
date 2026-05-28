import { memo, useMemo } from "react";
import { addDays, format, isSameDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDayNumberCircle } from "@/chip/icon/CalendarDayNumberCircle";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

type MiniCalendarSectionProps = {
  monthDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

const MINI_CALENDAR_DIVIDER_CLASS_NAME = "mt-2 h-px w-full shrink-0 bg-[#eeeeee]";
const MINI_CALENDAR_MONTH_LABEL_CLASS_NAME = "mb-1 flex h-7 items-center justify-center px-0.5 text-[14px] font-semibold leading-none tracking-[-0.01em] text-[#2f2f2f]";
const MINI_CALENDAR_WEEKDAY_CLASS_NAME = "flex h-6 items-center justify-center text-[11px] font-semibold leading-none tracking-[0.03em] text-[#8e8e93]";
const MINI_CALENDAR_DAY_BUTTON_CLASS_NAME = "relative flex h-7 w-full items-center justify-center transition-all duration-150 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7c7cc]";

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
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const monthLabel = useMemo(
    () => format(monthDate, monthLabelFormat, { locale: dateFnsLocale }),
    [dateFnsLocale, monthDate, monthLabelFormat],
  );
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );

  return (
    <>
      <section className="flex w-full shrink-0 flex-col pb-2.5 pl-0 pr-2.5 pt-2.5">
        <div className={MINI_CALENDAR_MONTH_LABEL_CLASS_NAME} aria-live="polite">
          {monthLabel}
        </div>

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

        <div className="grid grid-cols-7 gap-y-0.5 px-0.5">
          {miniCalendarDays.map((day) => {
            const isActive = day.isToday || day.isSelected;

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  MINI_CALENDAR_DAY_BUTTON_CLASS_NAME,
                  !isActive && "rounded-full hover:bg-[#f7f7f7]",
                )}
              >
                <CalendarDayNumberCircle
                  isToday={day.isToday}
                  isSelected={day.isSelected}
                  isCurrentMonth={day.isCurrentMonth}
                  className="relative z-10"
                >
                  {day.dayNumber}
                </CalendarDayNumberCircle>
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
