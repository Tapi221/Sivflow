import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CalendarDayNumberCircleProps = {
  children: ReactNode;
  isToday?: boolean;
  isSelected?: boolean;
  isCurrentMonth?: boolean;
  className?: string;
};

const CALENDAR_DAY_NUMBER_CIRCLE_CLASS_NAME =
  "flex h-[25px] w-[25px] items-center justify-center rounded-full text-[12px] font-[450] tabular-nums transition-all duration-150";
const CALENDAR_DAY_NUMBER_CIRCLE_TODAY_CLASS_NAME =
  "bg-[#eeeeee] !text-[#3f3f3f] shadow-none ring-1 ring-[#dedede]";
const CALENDAR_DAY_NUMBER_CIRCLE_SELECTED_CLASS_NAME =
  "bg-[#3a77b2] !text-white shadow-none ring-1 ring-[#3a77b2]";

const getCalendarDayNumberCircleClassName = ({
  isToday = false,
  isSelected = false,
  isCurrentMonth = true,
  className,
}: Omit<CalendarDayNumberCircleProps, "children">) =>
  cn(
    CALENDAR_DAY_NUMBER_CIRCLE_CLASS_NAME,
    isSelected
      ? CALENDAR_DAY_NUMBER_CIRCLE_SELECTED_CLASS_NAME
      : isToday
        ? CALENDAR_DAY_NUMBER_CIRCLE_TODAY_CLASS_NAME
        : isCurrentMonth
          ? "!text-[#666666]"
          : "!text-[#b8b8b8]",
    className,
  );

const CalendarDayNumberCircle = ({
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

export { CalendarDayNumberCircle };
export type { CalendarDayNumberCircleProps };
