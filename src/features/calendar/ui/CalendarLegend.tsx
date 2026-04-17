import { CALENDAR_RESISTANCE_LEGEND } from "@constants/shared/calendar";
import { cn } from "@/lib/utils";

export const CalendarLegend = () => {
  return (
    <div className="w-full mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 md:pl-10 pb-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#FF5A65]" />
        OVERDUE
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary-600" />
        INTENSITY
      </div>

      <div className="w-px h-3 bg-slate-300 mx-2" />

      {CALENDAR_RESISTANCE_LEGEND.map((item) => {
        return (
          <div key={item.label} className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", item.color)} />
            {item.label}
          </div>
        );
      })}
    </div>
  );
};
