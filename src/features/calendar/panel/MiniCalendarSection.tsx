import { memo, useMemo } from "react";
import { addDays, format, isSameDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDayNumberCircle } from "@/chip/icon/CalendarDayNumberCircle";
import { HoverTooltip } from "@/components/toolchip/HoverTooltip";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

const MINI_CALENDAR_NAV_BUTTON_CLASS_NAME =
  "flex h-7 w-7 items-center justify-center rounded-full text-[#b7b7b7] transition-all hover:bg-[#f7f7f7] hover:text-[#8c8c8c] active:scale-[0.94] active:bg-[#f1f1f1]";

const MINI_CALENDAR_DIVIDER_CLASS_NAME = "mt-2 h-px w-full shrink-0 bg-[#eeeeee]";

const IconChevronLeft = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 12L6 8L10 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconChevronRight = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M6 4L10 8L6 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

type MiniCalendarSectionProps = {
  monthDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
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
  onPreviousMonth,
  onNextMonth,
}: MiniCalendarSectionProps) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );

  return (
    <>
      <section className="flex w-full shrink-0 flex-col pb-2.5 pl-0 pr-2.5 pt-2.5">
        <div className="flex w-full items-center justify-between px-0.5">
          <span className="ml-3 text-[13px] font-extrabold tracking-[-0.01em] text-[#4a4a4a]">
            {format(monthDate, monthLabelFormat, { locale: dateFnsLocale })}
          </span>

          <div className="flex items-center gap-1">
            <HoverTooltip label={t.previousMonthLabel} side="top">
              <button
                type="button"
                className={MINI_CALENDAR_NAV_BUTTON_CLASS_NAME}
                onClick={onPreviousMonth}
                aria-label={t.previousMonthLabel}
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
            </HoverTooltip>

            <HoverTooltip label={t.nextMonthLabel} side="top">
              <button
                type="button"
                className={MINI_CALENDAR_NAV_BUTTON_CLASS_NAME}
                onClick={onNextMonth}
                aria-label={t.nextMonthLabel}
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </HoverTooltip>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-7 px-0.5">
          {t.miniCalendarWeekdays.map((weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              className="flex h-6 items-center justify-center text-[11px] font-extrabold uppercase text-[#8c8c8c]"
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
                  "relative flex h-7 w-full items-center justify-center transition-all duration-150 active:scale-[0.92]",
                  !isActive && "rounded-full hover:bg-[#f7f7f7]",
                )}
              >
                <CalendarDayNumberCircle
                  isToday={day.isToday}
                  isSelected={day.isSelected}
                  isCurrentMonth={day.isCurrentMonth}
                  className={cn(
                    "relative z-10 font-semibold",
                    day.isCurrentMonth && !isActive && "text-[#5f6673]",
                    !day.isCurrentMonth && !isActive && "text-[#b7b7b7]",
                  )}
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

export const MiniCalendarSection = memo(MiniCalendarSectionBase, (previous, next) => {
  return (
    isSameMonthValue(previous.monthDate, next.monthDate) &&
    isSameDayValue(previous.selectedDate, next.selectedDate) &&
    previous.onSelectDate === next.onSelectDate &&
    previous.onPreviousMonth === next.onPreviousMonth &&
    previous.onNextMonth === next.onNextMonth
  );
});
