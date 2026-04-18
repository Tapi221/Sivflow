import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

import { ChevronLeft, ChevronRight } from "@/ui/icons";

import { useCalendarScreen } from "@/features/calendar/application/useCalendarScreen";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarLegend } from "./CalendarLegend";
import { CalendarMetaPanel } from "./CalendarMetaPanel";

export const CalendarScreen = () => {
  const navigate = useNavigate();

  const {
    isMetaOpen,
    setIsMetaOpen,
    viewModel,
    ratings,
    openToday,
    goToPreviousMonth,
    goToNextMonth,
    selectDate,
  } = useCalendarScreen();

  return (
    <div className="relative min-h-screen bg-transparent text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 flex">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-3 z-20 h-8 w-8 rounded-full bg-[var(--sidebar-bg)] text-[#334155] surface-control-convex hover:bg-[var(--sidebar-active-bg)]"
        style={{
          right: isMetaOpen
            ? "calc(var(--ui-panel-width) - var(--ui-space-3))"
            : "var(--ui-space-1)",
          transform: "none",
        }}
        onClick={() => setIsMetaOpen((prev) => !prev)}
        aria-label={isMetaOpen ? "close meta panel" : "open meta panel"}
      >
        {isMetaOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <div className="min-w-0 flex-1 flex flex-col pl-4 pr-4 pt-4 pb-0 md:p-8">
        <div className="flex-1 w-full grid grid-cols-1 gap-6 md:gap-8 items-start mb-20 md:mb-0">
          <Card className="relative rounded-[32px] md:rounded-[40px] border border-[var(--surface-border)] surface-panel-convex bg-[var(--sidebar-bg)] p-4 md:p-10 h-fit md:min-h-[600px]">
            <CalendarHeader
              monthLabel={viewModel.header.monthLabel}
              streak={viewModel.header.streak}
              onToday={openToday}
              onPrevMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
            />

            <div className="pt-12 md:pt-14">
              <CalendarGrid grid={viewModel.grid} onSelectDate={selectDate} />
            </div>
          </Card>
        </div>

        <CalendarLegend />
      </div>

      <CalendarMetaPanel
        isOpen={isMetaOpen}
        isTodaySelected={viewModel.summary.isTodaySelected}
        todayDueCount={viewModel.summary.todayDueCount}
        todayDescription={viewModel.summary.todayDescription}
        ratings={{
          forgot: ratings.forgot,
          vague: ratings.vague,
          remembered: ratings.remembered,
          easy: ratings.easy,
        }}
        onNavigateStudy={navigate}
      />
    </div>
  );
};
