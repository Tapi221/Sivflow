import type { ReactNode } from "react";
import { CalendarDayNumberCircle } from "@/chip/icons/CalendarDayNumberCircle";
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
        "relative flex h-full w-full items-center justify-center rounded-full text-sm font-medium transition-colors",
        className,
      )}
    >
      <CalendarDayNumberCircle isToday={isToday} isSelected={isSelected}>
        {children}
      </CalendarDayNumberCircle>
    </button>
  );
};
