import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { TodayBar } from "@/chip/bar/TodayBar";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { CalendarViewMode, CalendarViewModeSelection } from "@/features/calendar/calendar.types";
import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { useCalendarEventMoveController, applyCalendarEventMoveOverrides } from "@/features/calendar/useCalendarEventMoveController";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { cn } from "@/lib/utils";
import { CalendarPieChartView } from "@/pane.desktop/leftpane/schedule/Calendar.PieChartView";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@shared/i18n/useT";

type MobileCalendarViewModeOption = {
  value: CalendarViewMode;
  label: string;
};

type MobileViewModeDropdownProps = {
  value: CalendarViewModeSelection;
  onChange: (value: CalendarViewMode) => void;
  options: readonly MobileCalendarViewModeOption[];
};

const IOS_CALENDAR_MONTH_SURFACE_CLASS = "border-transparent bg-[rgba(255,255,255,0.94)] shadow-none";
const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const MOBILE_SCHEDULE_STYLE = "@media (max-width: 767px) { .schedule-mobile-month-surface .calendar-month-view { --calendar-month-row-height: 82px !important; } .schedule-mobile-month-surface .calendar-month-row-boundary-resize-handle { display: none !important; } }";
const MOBILE_SCHEDULE_PANEL_CLASS = "!m-0 h-full min-h-0 !rounded-none !border-0 !shadow-none";
const MOBILE_SCHEDULE_HEADER_CLASS = "flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4";
const MOBILE_SCHEDULE_SURFACE_CLASS = "mx-0 flex min-h-0 flex-1 flex-col overflow-hidden !rounded-none !border-0";
const EMPTY_APP_PROJECTS = [];

const isSelectedViewMode = (value: CalendarViewModeSelection, optionValue: CalendarViewMode): boolean => Array.isArray(value) ? value.includes(optionValue) : value === optionValue;

const resolveSelectedViewModeLabel = (value: CalendarViewModeSelection, options: readonly MobileCalendarViewModeOption[]): string => options.find((option) => isSelectedViewMode(value, option.value))?.label ?? options[0]?.label ?? "表示形式";

const MobileViewModeDropdown = ({ value, onChange, options }: MobileViewModeDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = resolveSelectedViewModeLabel(value, options);

  const handleToggle = useCallback(() => {
    setIsOpen((currentValue) => !currentValue);
  }, []);

  const handleSelect = useCallback((nextValue: CalendarViewMode) => {
    onChange(nextValue);
    setIsOpen(false);
  }, [onChange]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current?.contains(event.target as Node)) return;

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3a3a3c] shadow-[0_1px_6px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition hover:bg-[#f7f7f7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1d1d6]" onClick={handleToggle} aria-label={`表示形式: ${selectedLabel}`} aria-haspopup="menu" aria-expanded={isOpen}>
        <span aria-hidden="true" className="flex h-5 w-5 flex-col justify-center gap-[5px]">
          <span className="block h-[2px] w-full rounded-full bg-current" />
          <span className="block h-[2px] w-full rounded-full bg-current" />
          <span className="block h-[2px] w-full rounded-full bg-current" />
        </span>
      </button>
      {isOpen && (
        <div role="menu" aria-label="表示形式" className="absolute right-0 top-[calc(100%+8px)] z-50 w-40 overflow-hidden rounded-2xl border border-[#e5e5ea] bg-white py-1 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
          {options.map((option) => {
            const isActive = isSelectedViewMode(value, option.value);

            return (
              <button key={option.value} type="button" role="menuitemradio" aria-checked={isActive} className={cn("flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] font-semibold tracking-[-0.02em] transition hover:bg-[#f7f7f7]", isActive ? "text-[#1c1c1e]" : "text-[#6e6e73]")} onClick={() => handleSelect(option.value)}>
                <span>{option.label}</span>
                {isActive && <span aria-hidden="true" className="text-[12px] text-[#8e8e93]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ScheduleScreen = (_props: ScheduleScreenProps) => {
  const pane = useScheduleScreen();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const { selectedViewMode, currentDate, selectedDate, titleDate, monthTitleDate, monthScrollTargetToken, visibleDays, googleCalendarEvents, googleAccounts, calendarGridStyle, headerScrollRef, allDayScrollRef, scrollContainerRef, contentViewportRef, handleCalendarScroll, handleSelectViewMode, handleSidebarSelectDate, handleVisibleDateChange, handleVisibleMonthChange, handlePrevious, handleNext, handleToday, handleMonthCellSelectDate, handleMonthRenderedRangeChange, updateGoogleCalendarEvent } = pane;
  const { calendarEventMoveOverrides, handleMoveCalendarEvent } = useCalendarEventMoveController({ updateGoogleCalendarEvent });
  const visibleGoogleCalendarEvents = useMemo(() => applyCalendarEventMoveOverrides(googleCalendarEvents, calendarEventMoveOverrides), [calendarEventMoveOverrides, googleCalendarEvents]);
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
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 pt-1">
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]" onClick={handlePrevious} aria-label={t.previousLabel}>‹</button>
          <h1 className="truncate text-[19px] font-bold tracking-[-0.03em] text-[#1c1c1e]">{format(headerTitleDate, headerTitleFormat, { locale: dateFnsLocale })}</h1>
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]" onClick={handleNext} aria-label={t.nextLabel}>›</button>
        </div>
        <MobileViewModeDropdown value={selectedViewMode} onChange={handleSelectViewMode} options={viewOptions} />
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <TodayBar onPrevious={handlePrevious} onNext={handleNext} onToday={handleToday} />
      </div>
    </div>
  );

  const renderCalendarContent = () => {
    if (isPieChartCalendarView) {
      return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarPieChartView days={visibleDays} selectedDate={selectedDate} events={visibleGoogleCalendarEvents} appProjects={EMPTY_APP_PROJECTS} googleAccounts={googleAccounts} onSelectDate={handleSidebarSelectDate} onVisibleDateChange={handleVisibleDateChange} /></div></CarvePanel>;
    }

    if (isMonthCalendarView) {
      return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn("schedule-mobile-month-surface", MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_MONTH_SURFACE_CLASS)}><CalendarMonthView currentDate={currentDate} selectedDate={selectedDate} scrollTargetToken={monthScrollTargetToken} visibleEvents={visibleGoogleCalendarEvents} onSelectDate={handleSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onRenderedRangeChange={handleMonthRenderedRangeChange} onMoveCalendarEvent={handleMoveCalendarEvent} /></div></CarvePanel>;
    }

    return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={visibleGoogleCalendarEvents} calendarGridStyle={calendarGridStyle} onScroll={handleCalendarScroll} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} onMoveCalendarEvent={handleMoveCalendarEvent} /></div></CarvePanel>;
  };

  return <div ref={contentViewportRef} className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-[#1c1c1e]"><style>{MOBILE_SCHEDULE_STYLE}</style><main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white p-0">{renderCalendarContent()}</main></div>;
};

export { ScheduleScreen };
