import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CalendarDayNumberCircleProps = {
  children: ReactNode;
  isToday?: boolean;
  isSelected?: boolean;
  isCurrentMonth?: boolean;
  className?: string;
  style?: CSSProperties;
  allowsCustomBackground?: boolean;
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
}: Omit<CalendarDayNumberCircleProps, "children" | "style" | "allowsCustomBackground">) =>
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

const getCalendarDayNumberCircleStyle = (
  style?: CSSProperties,
  allowsCustomBackground = false,
): CSSProperties | undefined => {
  if (!style) return undefined;
  if (allowsCustomBackground) return style;

  const circleStyle = { ...style };
  delete circleStyle.backgroundColor;

  return circleStyle;
};

const CalendarDayNumberCircle = ({
  children,
  isToday = false,
  isSelected = false,
  isCurrentMonth = true,
  className,
  style,
  allowsCustomBackground = true,
}: CalendarDayNumberCircleProps) => {
  return (
    <span
      className={getCalendarDayNumberCircleClassName({
        isToday,
        isSelected,
        isCurrentMonth,
        className,
      })}
      style={getCalendarDayNumberCircleStyle(style, allowsCustomBackground)}
    >
      {children}
    </span>
  );
};

export { CalendarDayNumberCircle };
export type { CalendarDayNumberCircleProps };
