import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CalendarDayNumberCircleProps = {
  children: ReactNode;
  isToday?: boolean;
  isSelected?: boolean;
  isCurrentMonth?: boolean;
  className?: string;
};

export const CALENDAR_DAY_NUMBER_CIRCLE_CLASS_NAME =
  "flex h-[25px] w-[25px] items-center justify-center rounded-full border border-transparent text-[12px] font-semibold tabular-nums transition-all duration-150";

const CALENDAR_DAY_ACTIVE_CLASS_NAME =
  "border-[#eeeeee] bg-[#f7f7f7] text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.06)]";

export const getCalendarDayNumberCircleClassName = ({
  isToday = false,
  isSelected = false,
  isCurrentMonth = true,
  className,
}: Omit<CalendarDayNumberCircleProps, "children">) =>
  cn(
    CALENDAR_DAY_NUMBER_CIRCLE_CLASS_NAME,
    isToday
      ? CALENDAR_DAY_ACTIVE_CLASS_NAME
      : isSelected
        ? CALENDAR_DAY_ACTIVE_CLASS_NAME
        : isCurrentMonth
          ? "text-[#2f2f2f]"
          : "text-[#bdbdbd]",
    className,
  );

export const CalendarDayNumberCircle = ({
  children,
  isToday = false,
  isSelected = false,
  isCurrentMonth = true,
  className,
}: CalendarDayNumberCircleProps) => {
  return (
    <span
      className={getCalendarDayNumberCircleClassName({
        isToday,
        isSelected,
        isCurrentMonth,
        className,
      })}
    >
      {children}
    </span>
  );
};