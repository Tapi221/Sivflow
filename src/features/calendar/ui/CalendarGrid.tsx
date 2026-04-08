import { cn } from "@/lib/utils";
import type { CalendarGridViewModel } from "@/features/calendar/domain/calendarTypes";

type CalendarGridProps = {
  grid: CalendarGridViewModel;
  onSelectDate: (date: Date) => void;
};

export const CalendarGrid = ({ grid, onSelectDate }: CalendarGridProps) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-7 mb-4">
        {grid.weekDays.map((day) => {
          const isSunday = day === "SUN";
          const isSaturday = day === "SAT";

          return (
            <div
              key={day}
              className={cn(
                "text-center text-[10px] font-bold tracking-[0.2em] text-slate-500",
                isSunday && "text-[#FF5A65]",
                isSaturday && "text-[#00A3FF]",
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-y-2 md:gap-y-4 gap-x-0">
        {grid.days.map((day) => {
          const hasCards = day.cards.length > 0;
          const hasOverdue = day.cards.some((card) => card.is_overdue);

          return (
            <div
              key={day.dateKey}
              onClick={() => onSelectDate(day.date)}
              className={cn(
                "calendar-day-base cursor-pointer group min-h-[56px] md:min-h-[88px]",
                !day.isCurrentMonth && "opacity-30 grayscale",
                day.isSelected ? "calendar-day-selected" : "calendar-day-flat",
                day.isToday && !day.isSelected && "calendar-day-today",
              )}
            >
              <span
                className={cn(
                  "text-sm font-bold mb-1 md:mb-1 transition-colors calendar-date-text",
                  day.isSelected
                    ? "text-primary-700"
                    : "text-slate-400 group-hover:text-slate-600",
                  day.isToday && !day.isSelected && "text-primary-700",
                )}
              >
                {day.date.getDate()}
              </span>

              {hasCards ? (
                <div className="flex flex-col items-center mt-0 gap-1 w-full">
                  <span
                    className={cn(
                      "text-convex text-lg md:text-xl font-black leading-none tracking-tight",
                      hasOverdue ? "text-[#FF5A65]" : "text-primary-600",
                    )}
                  >
                    {day.cards.length}
                  </span>

                  <div className="hidden md:flex gap-1 justify-center w-full px-2">
                    {Array.from({ length: day.intensity }).map((_, index) => (
                      <div
                        key={`${day.dateKey}-${index}`}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full calendar-dot-3d face-badge-convex",
                          hasOverdue ? "bg-[#FF5A65]" : "bg-primary-400",
                        )}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                day.isToday && (
                  <div className="mt-2 text-[9px] font-bold text-primary-300">
                    TODAY
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
