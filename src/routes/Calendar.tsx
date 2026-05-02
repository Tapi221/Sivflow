import { ExplorerCalendarPane } from "@/features/calendar/ui/ExplorerCalendarPane";

const CalendarHero = () => {
  return (
    <section className="shrink-0 rounded-[12px] bg-[#f5f5f5] px-6 py-6">
      <h1 className="text-[20px] font-bold leading-[32px] text-[#25272d]">
        カレンダー
      </h1>
      <div className="mt-4 min-h-[180px]" />
    </section>
  );
};

const Calendar = () => {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <CalendarHero />
      <div className="mt-4 min-h-0 flex-1">
        <ExplorerCalendarPane />
      </div>
    </div>
  );
};

export default Calendar;
