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
  "flex h-[25px] w-[25px] items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-all duration-150";

export const getCalendarDayNumberCircleClassName = ({
  isToday = false,
  isSelected = false,
  isCurrentMonth = true,
  className,
}: Omit<CalendarDayNumberCircleProps, "children">) =>
  cn(
    CALENDAR_DAY_NUMBER_CIRCLE_CLASS_NAME,
    isToday
      ? "bg-[#007aff] text-white shadow-[0_5px_12px_rgba(0,122,255,0.28)]"
      : isSelected
        ? "bg-[#1f2937] text-white shadow-[0_4px_10px_rgba(15,23,42,0.2)]"
        : isCurrentMonth
          ? "text-[#111827]"
          : "text-[#c2c7d0]",
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
