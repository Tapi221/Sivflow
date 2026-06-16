import { CalendarDayNumberCircle } from "@web-renderer/chip/icons/CalendarDayNumberCircle";
import { cn } from "@web-renderer/lib/utils";
import type { ReactNode } from "react";



type CalendarDateButtonProps = {
  children: ReactNode;
  isToday: boolean;
  isSelected: boolean;
  onClick?: () => void;
  className?: string;
};



const CalendarDateButton = ({ children, isToday, isSelected, onClick, className }: CalendarDateButtonProps) => {
  return (<button type="button" onClick={onClick} className={cn("relative flex h-full w-full items-center justify-center rounded-full text-sm font-medium transition-colors", className)} > <CalendarDayNumberCircle isToday={isToday} isSelected={isSelected}> {children} </CalendarDayNumberCircle> </button>);
};



export { CalendarDateButton };
