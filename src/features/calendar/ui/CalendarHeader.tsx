import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/ui/icons";

type CalendarHeaderProps = {
  monthLabel: string;
  streak: number;
  onToday: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

export const CalendarHeader = ({
  monthLabel,
  streak,
  onToday,
  onPrevMonth,
  onNextMonth,
}: CalendarHeaderProps) => {
  return (
    <>
      <div className="absolute top-4 left-4 md:top-8 md:left-8 h-10 rounded-full border border-[var(--surface-border)] bg-white px-3 face-badge-convex z-10 min-w-[112px] text-slate-500 flex items-center">
        <div className="leading-none">
          <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
            STREAK
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-[#FB923C]" />
            <span className="text-lg font-bold leading-none text-slate-500">
              {streak}
            </span>
            <span className="text-sm font-semibold text-slate-500">days</span>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onToday}
        className="absolute top-4 right-4 md:top-8 md:right-8 h-10 rounded-full border border-[var(--surface-border)] text-slate-500 font-bold px-4 hover:border-primary-600 hover:text-primary-600 bg-white face-badge-convex z-10"
      >
        Today
      </Button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 md:top-8 z-10">
        <div className="flex items-center bg-white rounded-full p-1 border border-[var(--surface-border)] face-badge-convex h-10 min-w-[280px] md:min-w-[320px] justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevMonth}
            className="h-8 w-8 rounded-full text-[#334155] hover:text-primary-600 bg-white surface-control-convex hover:bg-white shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="flex-1 text-center text-[11px] sm:text-xs font-extrabold text-[#334155] tracking-wider uppercase">
            {monthLabel}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            className="h-8 w-8 rounded-full text-[#334155] hover:text-primary-600 bg-white surface-control-convex hover:bg-white shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
};
