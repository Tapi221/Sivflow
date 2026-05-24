import type { ReactNode } from "react";

import { CalendarDayNumberCircle } from "@/chip/icon/CalendarDayNumberCircle";
import { cn } from "@/lib/utils";

type CalendarDateButtonProps = {
  children: ReactNode;
  isToday: boolean;
  isSelected: boolean;
  onClick?: () => void;
  className?: string;
};

export const CalendarDateButton = ({
  children,
  isToday,
  isSelected,
  onClick,
  className,
}: CalendarDateButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 shrink-0 select-none flex-col items-center justify-center bg-white",
        "appearance-none border-0 p-0 transition-colors hover:bg-[#f4f5f7]",
        "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        isToday && "bg-[#f0f6ff]",
        !isToday && isSelected && "bg-[#f4f5f7]",
        className,
      )}
      aria-pressed={isSelected}
    >
      {children}
    </button>
  );
};

type CalendarDateContentProps = {
  dateLabel: ReactNode;
  weekdayLabel: ReactNode;
  isToday: boolean;
  isSelected: boolean;
  layout: "weekday-date" | "date-weekday";
};

export const CalendarDateContent = ({
  dateLabel,
  weekdayLabel,
  isToday,
  isSelected,
  layout,
}: CalendarDateContentProps) => {
  const weekday = (
    <span
      className={cn(
        "font-serif text-[11px] font-medium leading-none",
        isToday || isSelected ? "text-[#24231f]" : "text-[#8f929c]",
      )}
    >
      {weekdayLabel}
    </span>
  );

  const dayNumber = (
    <CalendarDayNumberCircle
      isToday={isToday}
      isSelected={isSelected}
      className={cn("font-serif", layout === "weekday-date" && "mt-0.5")}
    >
      {dateLabel}
    </CalendarDayNumberCircle>
  );

  if (layout === "weekday-date") {
    return (
      <>
        {weekday}
        {dayNumber}
      </>
    );
  }

  return (
    <>
      {dayNumber}
      <span className="mt-0.5 font-serif text-[11px] font-medium leading-none text-[#8f929c]">
        {weekdayLabel}
      </span>
    </>
  );
};