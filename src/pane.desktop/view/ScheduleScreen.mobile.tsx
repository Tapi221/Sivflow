import { useCallback, useMemo } from "react";
import { format } from "date-fns";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/toggle/Toggle.calendarviewmode";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { cn } from "@/lib/utils";
import { CalendarPieChartView } from "@/pane.desktop/leftpane/schedule/Calendar.PieChartView";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@shared/i18n/useT";

const IOS_CALENDAR_MONTH_SURFACE_CLASS = "border-transparent bg-[rgba(255,255,255,0.94)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";
const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const MOBILE_SCHEDULE_STYLE = `@media (max-width: 767px) { .schedule-mobile-month-surface .calendar-month-view { --calendar-month-row-height: 82px !important; } .schedule-mobile-month-surface .calendar-month-row-boundary-resize-handle { display: none !important; } }`;
const EMPTY_APP_PROJECTS = [];

export const ScheduleScreen = (_props: ScheduleScreenProps) => {
  const pane = useScheduleScreen();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const { selectedViewMode, currentDate, selectedDate, titleDate, monthTitleDate, monthScrollTargetToken, visibleDays, googleCalendarEvents, googleAccounts, calendarGridStyle, headerScrollRef, allDayScrollRef, scrollContainerRef, contentViewportRef, handleCalendarScroll, handleSelectViewMode, handleSidebarSelectDate, handleVisibleDateChange, handleVisibleMonthChange, handlePrevious, handleNext, handleToday, handleMonthCellSelectDate, handleMonthRenderedRangeChange } = pane;
  const viewOptions = useMemo(() => [{ value: "month", label: t.viewMonth }, { value: "week", label: t.viewWeek }, { value: "threeDays", label: t.viewThreeDays }, { value: "days", label: t.viewDay }, { value: "pieChart", label: t.viewPieChart }] as const, [t.viewDay, t.viewMonth, t.viewPieChart, t.viewThreeDays, t.viewWeek]);
  const isMonthCalendarView = selectedViewMode === "month";
  const isPieChartCalendarView = selectedViewMode === "pieChart";
  const headerTitleDate = selectedViewMode === "month" ? monthTitleDate : isPieChartCalendarView ? selectedDate : titleDate;
  const headerTitleFormat = isPieChartCalendarView ? "yyyy年M月d日" : monthLabelFormat;

  const handleSelectDate = useCallback((date: Date) => {
    if (selectedViewMode === "month") {
      handleMonthCellSelectDate(date);
      return;
    }

    handleSidebarSelectDate(date);
  }, [handleMonthCellSelectDate, handleSidebarSelectDate, selectedViewMode]);

  const renderViewHeader = (className: string) => (
    <div className={className}>
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]" onClick={handlePrevious} aria-label={t.previousLabel}>‹</button>
        <h1 className="truncate text-[19px] font-bold tracking-[-0.03em] text-[#1c1c1e]">{format(headerTitleDate, headerTitleFormat, { locale: dateFnsLocale })}</h1>
        <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]" onClick={handleNext} aria-label={t.nextLabel}>›</button>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ViewModeDropdown value={selectedViewMode} onChange={handleSelectViewMode} options={viewOptions} />
        <TodayBar onPrevious={handlePrevious} onNext={handleNext} onToday={handleToday} />
      </div>
    </div>
  );

  const renderCalendarContent = () => {
    if (isPieChartCalendarView) {
      return <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">{renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}<div className="mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#eeeeee] bg-white"><CalendarPieChartView days={visibleDays} selectedDate={selectedDate} events={googleCalendarEvents} appProjects={EMPTY_APP_PROJECTS} googleAccounts={googleAccounts} onSelectDate={handleSidebarSelectDate} onVisibleDateChange={handleVisibleDateChange} /></div></CarvePanel>;
    }

    if (isMonthCalendarView) {
      return <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">{renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}<div className={cn("schedule-mobile-month-surface mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border", IOS_CALENDAR_MONTH_SURFACE_CLASS)}><CalendarMonthView currentDate={currentDate} selectedDate={selectedDate} scrollTargetToken={monthScrollTargetToken} visibleEvents={googleCalendarEvents} onSelectDate={handleSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onRenderedRangeChange={handleMonthRenderedRangeChange} /></div></CarvePanel>;
    }

    return <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">{renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}<div className={cn("mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border", IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={googleCalendarEvents} calendarGridStyle={calendarGridStyle} onScroll={handleCalendarScroll} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} /></div></CarvePanel>;
  };

  return <div ref={contentViewportRef} className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-[#1c1c1e]"><style>{MOBILE_SCHEDULE_STYLE}</style><main className="min-h-0 flex-1 overflow-y-auto bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">{renderCalendarContent()}</main></div>;
};
