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
  "flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-all duration-150";
const CALENDAR_DAY_NUMBER_CIRCLE_TODAY_CLASS_NAME =
  "bg-slate-100 !text-slate-700 shadow-none ring-1 ring-slate-200";
const CALENDAR_DAY_NUMBER_CIRCLE_SELECTED_CLASS_NAME =
  "border-0 bg-sky-100 !text-sky-700 shadow-none ring-0";

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
          ? "!text-slate-600"
          : "!text-slate-400",
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
