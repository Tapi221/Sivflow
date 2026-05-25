import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CalendarDayNumberCircleProps = {
  children: ReactNode;
  isToday?: boolean;
  isSelected?: boolean;
  isCurrentMonth?: boolean;
  className?: string;
};

const CALENDAR_DAY_NUMBER_CIRCLE_CLASS_NAME =
  "flex h-[25px] w-[25px] items-center justify-center rounded-full text-[12px] font-medium tabular-nums transition-all duration-150";

const getCalendarDayNumberCircleClassName = ({
  isToday = false,
  isSelected = false,
  isCurrentMonth = true,
  className,
}: Omit<CalendarDayNumberCircleProps, "children">) =>
  cn(
    CALENDAR_DAY_NUMBER_CIRCLE_CLASS_NAME,
    isToday
      ? "bg-[#007aff] !text-white shadow-[0_5px_12px_rgba(0,122,255,0.28)]"
      : isSelected
        ? "bg-[#3f3f3f] !text-white shadow-[0_4px_10px_rgba(63,63,63,0.14)]"
        : isCurrentMonth
          ? "!text-[#666666]"
          : "!text-[#b8b8b8]",
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
