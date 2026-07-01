import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@shared/i18n/useT";
import { CarvePanel } from "@web-renderer/chip/panel/panel/CarvePanel.desktop";
import { cn } from "@web-renderer/lib/utils";
import { addDays, endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import type { ComponentType, SVGProps } from "react";
import * as stratisIcons from "stratis-ui-icons";
import { createCalendarYearEventDisplayResolver } from "@/features/calendar/calendarEventSourcePriority";
import { attachCalendarEventDisplayMetadata, filterCalendarEventsBySourceVisibility } from "@/features/calendar/calendarEventVisibility";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarYearView } from "@/features/calendar/grid/CalendarView.year";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import { CalendarListView } from "@/features/calendar/list/CalendarListView.desktop";
import type { AppCalendarItem, CalendarViewMode, CalendarViewModeSelection, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { CalendarTimetableView } from "@/features/calendar/timetable/CalendarTimetableView";
import { applyCalendarEventMoveOverrides, useCalendarEventMoveController } from "@/features/calendar/useCalendarEventMoveController";
import { useProjectCalendarActions } from "@/features/calendar/useProjectCalendarActions";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { createCalendarEventsScopeKey, useTransientEmptyCalendarEvents } from "@/features/calendar/useTransientEmptyCalendarEvents";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { CalendarPieChartView } from "@/pane.desktop/leftpane/schedule/Calendar.PieChartView";
import { MobileCalendarEventComposer } from "./MobileCalendarEventComposer";
import { MobileCalendarSidebar, MobileCalendarSidebarOpenButton } from "./MobileCalendarSidebar";



type CalendarEventDisplayRange = {
  start: Date; end: Date; };
type CalendarEventDisplayRangeOptions = {
  primaryViewMode: CalendarViewMode; currentDate: Date; selectedDate: Date; monthTitleDate: Date; visibleDays: Date[]; monthRenderedRange: CalendarDateRange | null; yearRenderedRange: CalendarDateRange | null; };
type MobileCalendarViewModeOption = {
  value: CalendarViewMode; label: string; };
type MobileViewModeDropdownProps = {
  value: CalendarViewModeSelection; onChange: (value: CalendarViewMode) => void; options: readonly MobileCalendarViewModeOption[]; };
type StratisIconComponent = ComponentType<SVGProps<SVGSVGElement>>;



const STRATIS_ICON_COMPONENTS = stratisIcons as unknown as Record<string, StratisIconComponent | undefined>;
const STRATIS_CHECK_ICON_NAMES = ["StratisCheckIcon", "StratisCheck01Icon", "StratisCheckCircleContainedIcon"] as const;
const STRATIS_PLUS_ICON_NAMES = ["StratisPlus01Icon", "StratisPlusIcon"] as const;
const IOS_CALENDAR_MONTH_SURFACE_CLASS = "border-transparent bg-[rgba(255,255,255,0.94)] shadow-none";
const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const MOBILE_SCHEDULE_STYLE = ".schedule-mobile-list-view > .scrollbar-hidden { padding-left: 0 !important; padding-right: 8px !important; } .schedule-mobile-list-view > .scrollbar-hidden > div { margin-left: 0 !important; margin-right: 0 !important; max-width: none !important; } .schedule-mobile-list-view > .scrollbar-hidden > div > div > span { left: 104px !important; } .schedule-mobile-list-view section { grid-template-columns: 48px minmax(0, 1fr) !important; column-gap: 0 !important; } .schedule-mobile-list-view section > button { justify-content: flex-start !important; padding-right: 0 !important; text-align: left !important; } .schedule-mobile-list-view section > div > span { left: 56px !important; } .schedule-mobile-list-view section [class*=\"grid-cols-[54px_26px_minmax\"] { grid-template-columns: 44px 24px minmax(0, 1fr) !important; } @media (max-width: 767px) { .schedule-mobile-month-surface .calendar-month-row-boundary-resize-handle { display: none !important; } .schedule-mobile-calendar-surface .calendar-month-scroll, .schedule-mobile-calendar-surface .calendar-timeline-scroll, .schedule-mobile-calendar-surface .calendar-year-view, .schedule-mobile-calendar-surface .scrollbar-hidden { -ms-overflow-style: none; scrollbar-gutter: auto; scrollbar-width: none; } .schedule-mobile-calendar-surface .calendar-month-scroll::-webkit-scrollbar, .schedule-mobile-calendar-surface .calendar-timeline-scroll::-webkit-scrollbar, .schedule-mobile-calendar-surface .calendar-year-view::-webkit-scrollbar, .schedule-mobile-calendar-surface .scrollbar-hidden::-webkit-scrollbar { display: none; width: 0; height: 0; } }";
const MOBILE_SCHEDULE_PANEL_CLASS = "!m-0 h-full min-h-0 !rounded-none !border-0 !shadow-none";
const MOBILE_SCHEDULE_HEADER_CLASS = "flex shrink-0 flex-col px-4 pb-3 pt-4";
const MOBILE_SCHEDULE_SURFACE_CLASS = "schedule-mobile-calendar-surface mx-0 flex min-h-0 flex-1 flex-col overflow-hidden !rounded-none !border-0";
const MOBILE_TODAY_BUTTON_CLASS = "flex h-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 px-3 text-xs font-semibold tracking-tight text-zinc-500 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition hover:bg-[#efeff4] hover:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1d1d6]";
const MOBILE_ADD_EVENT_BUTTON_CLASS = "fixed bottom-[calc(env(safe-area-inset-bottom)+28px)] right-5 z-40 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[rgba(60,60,67,0.08)] bg-white text-[#3478f6] shadow-[0_3px_12px_rgba(60,60,67,0.16),0_1px_3px_rgba(60,60,67,0.12)] transition active:scale-[0.97] hover:bg-[#fdfdfd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3478f6]/30";
const MOBILE_LIST_VIEW_CLASS = "schedule-mobile-list-view";
const LIST_AND_PIE_CHART_EVENT_BUFFER_DAYS = 45;
const WEEKDAY_EVENT_BUFFER_DAYS = 1;
const MONTH_EVENT_BUFFER_DAYS = 14;
const EMPTY_APP_PROJECTS: AppCalendarItem[] = [];



const resolveStratisIcon = (names: readonly string[]): StratisIconComponent | null => names.map((name) => STRATIS_ICON_COMPONENTS[name]).find((Icon): Icon is StratisIconComponent => Boolean(Icon)) ?? null;



const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);
const StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);



const buildDaysDisplayRange = (days: Date[], fallbackDate: Date, bufferDays: number): CalendarEventDisplayRange => ({ start: startOfDay(subDays(days[0] ?? fallbackDate, bufferDays)), end: endOfDay(addDays(days.at(-1) ?? fallbackDate, bufferDays)) });
const buildMonthAnchoredDisplayRange = (monthTitleDate: Date, bufferDays: number): CalendarEventDisplayRange => ({ start: startOfDay(subDays(startOfMonth(monthTitleDate), bufferDays)), end: endOfDay(addDays(endOfMonth(monthTitleDate), bufferDays)) });
const buildYearDisplayRange = (currentDate: Date, yearRenderedRange: CalendarDateRange | null): CalendarEventDisplayRange => {
  if (!yearRenderedRange) return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
  return { start: startOfDay(yearRenderedRange.start), end: endOfDay(yearRenderedRange.end) };
};
const buildCalendarDateDisplayRange = (range: CalendarDateRange): CalendarEventDisplayRange => ({ start: startOfDay(range.start), end: endOfDay(range.end) });
const getScheduleEventDisplayRange = ({ primaryViewMode, currentDate, selectedDate, monthTitleDate, visibleDays, monthRenderedRange, yearRenderedRange }: CalendarEventDisplayRangeOptions): CalendarEventDisplayRange => {
  if (primaryViewMode === "year") return buildYearDisplayRange(currentDate, yearRenderedRange);
  if (primaryViewMode === "month") return monthRenderedRange ? buildCalendarDateDisplayRange(monthRenderedRange) : buildDaysDisplayRange(visibleDays, currentDate, MONTH_EVENT_BUFFER_DAYS);
  if (primaryViewMode === "list") return buildMonthAnchoredDisplayRange(monthTitleDate, LIST_AND_PIE_CHART_EVENT_BUFFER_DAYS);
  if (primaryViewMode === "pieChart") return buildDaysDisplayRange(visibleDays, selectedDate, LIST_AND_PIE_CHART_EVENT_BUFFER_DAYS);
  return buildDaysDisplayRange(visibleDays, selectedDate, WEEKDAY_EVENT_BUFFER_DAYS);
};
const eventOverlapsDisplayRange = (event: GoogleCalendarEvent, range: CalendarEventDisplayRange): boolean => event.startsAt <= range.end && event.endsAt >= range.start;
const filterEventsByDisplayRange = (events: GoogleCalendarEvent[], range: CalendarEventDisplayRange): GoogleCalendarEvent[] => events.filter((event) => eventOverlapsDisplayRange(event, range));
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
      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_1px_6px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1d1d6]" onClick={handleToggle} aria-label={`表示形式: ${selectedLabel}`} aria-haspopup="menu" aria-expanded={isOpen}>
        <span aria-hidden="true" className="flex h-5 w-5 flex-col justify-center gap-1">
          <span className="block h-0.5 w-full rounded-full bg-current" />
          <span className="block h-0.5 w-full rounded-full bg-current" />
          <span className="block h-0.5 w-full rounded-full bg-current" />
        </span>
      </button>
      {isOpen ? (
        <div role="menu" aria-label="表示形式" className="absolute right-0 top-[calc(100%+8px)] z-50 w-40 overflow-hidden rounded-lg border border-black/10 bg-white py-1 shadow-lg">
          {options.map((option) => {
            const isActive = isSelectedViewMode(value, option.value);
            return (
              <button key={option.value} type="button" role="menuitemradio" aria-checked={isActive} className={cn("flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold tracking-tight transition hover:bg-zinc-100", isActive ? "text-zinc-900" : "text-zinc-500")} onClick={() => handleSelect(option.value)}>
                <span>{option.label}</span>
                {isActive && StratisCheckIcon ? <StratisCheckIcon className="h-3 w-3 text-zinc-500" aria-hidden="true" focusable="false" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
const ScheduleScreen = (_props: ScheduleScreenProps) => {
  const pane = useScheduleScreen({ allowMultiSelectViewMode: false });
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEventComposerOpen, setIsEventComposerOpen] = useState(false);
  const [timetableAddRequestToken, setTimetableAddRequestToken] = useState(0);
  const { selectedViewMode, primaryViewMode, currentDate, selectedDate, titleDate, monthTitleDate, monthScrollTargetToken, visibleDays, virtualRail, yearRenderedRange, googleCalendarEvents, googleAccounts, calendarGridStyle, headerScrollRef, allDayScrollRef, scrollContainerRef, contentViewportRef, handleCalendarScroll, handleSelectViewMode, handleSidebarSelectDate, handleVisibleDateChange, handleVisibleMonthChange, handlePrevious, handleNext, handleToday, handleMonthCellSelectDate, handleMonthRenderedRangeChange, handleYearRenderedRangeChange, handleYearSyncRangeChange, addGoogleCalendar, reconnectGoogleAccount, toggleGoogleCalendar, createGoogleCalendarEvent, updateGoogleCalendarEvent } = pane;
  const { appProjects, projectCalendarLinks, googleCalendarColorOverrides, googleAccountsWithColorOverrides } = useProjectCalendarActions({ googleAccounts, reconnectGoogleAccount, toggleGoogleCalendar });
  const { calendarEventMoveOverrides, handleMoveCalendarEvent } = useCalendarEventMoveController({ updateGoogleCalendarEvent });
  const viewOptions = useMemo(() => [{ value: "year", label: t.viewYear }, { value: "month", label: t.viewMonth }, { value: "week", label: t.viewWeek }, { value: "threeDays", label: t.viewThreeDays }, { value: "days", label: t.viewDay }, { value: "list", label: t.viewList }, { value: "timetable", label: t.viewTimetable }, { value: "pieChart", label: t.viewPieChart }] as const, [t.viewDay, t.viewList, t.viewMonth, t.viewPieChart, t.viewThreeDays, t.viewTimetable, t.viewWeek, t.viewYear]);
  const googleAccountsWithColorOverridesForSidebar = googleAccountsWithColorOverrides;
  const yearEventDisplayResolver = useMemo(() => createCalendarYearEventDisplayResolver({ appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverridesForSidebar }), [appProjects, googleAccountsWithColorOverridesForSidebar, projectCalendarLinks]);
  const linkedGoogleCalendarEvents = useMemo(() => attachCalendarEventDisplayMetadata(googleCalendarEvents, { appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverridesForSidebar, googleCalendarColorOverrides }), [appProjects, googleAccountsWithColorOverridesForSidebar, googleCalendarColorOverrides, googleCalendarEvents, projectCalendarLinks]);
  const overriddenGoogleCalendarEvents = useMemo(() => applyCalendarEventMoveOverrides(linkedGoogleCalendarEvents, calendarEventMoveOverrides), [calendarEventMoveOverrides, linkedGoogleCalendarEvents]);
  const visibleGoogleCalendarEvents = useMemo(() => filterCalendarEventsBySourceVisibility(overriddenGoogleCalendarEvents, { appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverridesForSidebar }), [appProjects, googleAccountsWithColorOverridesForSidebar, overriddenGoogleCalendarEvents, projectCalendarLinks]);
  const mainDisplayRange = useMemo(() => getScheduleEventDisplayRange({ primaryViewMode, currentDate, selectedDate, monthTitleDate, visibleDays, monthRenderedRange: pane.monthRenderedRange, yearRenderedRange }), [currentDate, monthTitleDate, pane.monthRenderedRange, primaryViewMode, selectedDate, visibleDays, yearRenderedRange]);
  const mainDisplayRangeKey = useMemo(() => createCalendarEventsScopeKey(mainDisplayRange.start, mainDisplayRange.end), [mainDisplayRange]);
  const rawMainCalendarEvents = useMemo(() => filterEventsByDisplayRange(visibleGoogleCalendarEvents, mainDisplayRange), [mainDisplayRange, visibleGoogleCalendarEvents]);
  const mainCalendarEvents = useTransientEmptyCalendarEvents(rawMainCalendarEvents, mainDisplayRangeKey);
  const isYearCalendarView = primaryViewMode === "year";
  const isMonthCalendarView = primaryViewMode === "month";
  const isListCalendarView = primaryViewMode === "list";
  const isTimetableCalendarView = primaryViewMode === "timetable";
  const isPieChartCalendarView = primaryViewMode === "pieChart";
  const headerTitleDate = isYearCalendarView ? currentDate : isMonthCalendarView || isListCalendarView ? monthTitleDate : isPieChartCalendarView ? selectedDate : titleDate;
  const headerTitleFormat = isYearCalendarView ? "yyyy年" : isPieChartCalendarView ? "yyyy年M月d日" : monthLabelFormat;

  const handleOpenSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleOpenEventComposer = useCallback(() => {
    setIsEventComposerOpen(true);
  }, []);

  const handleCloseEventComposer = useCallback(() => {
    setIsEventComposerOpen(false);
  }, []);

  const handleRequestTimetableAdd = useCallback(() => {
    setTimetableAddRequestToken((currentToken) => currentToken + 1);
  }, []);

  const handleAddScheduleItem = useCallback(() => {
    if (isTimetableCalendarView) {
      handleRequestTimetableAdd();
      return;
    }

    handleOpenEventComposer();
  }, [handleOpenEventComposer, handleRequestTimetableAdd, isTimetableCalendarView]);

  const handleSelectDate = useCallback((date: Date) => {
    if (primaryViewMode === "month") {
      handleMonthCellSelectDate(date);
      return;
    }

    handleSidebarSelectDate(date);
  }, [handleMonthCellSelectDate, handleSidebarSelectDate, primaryViewMode]);

  const renderViewHeader = (className: string) => (
    <div className={className}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 pt-1">
          <MobileCalendarSidebarOpenButton isOpen={isSidebarOpen} onOpen={handleOpenSidebar} />
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-zinc-100 hover:text-zinc-500" onClick={handlePrevious} aria-label={t.previousLabel}>‹</button>
          <h1 className="truncate text-lg font-bold tracking-tight text-zinc-900">{format(headerTitleDate, headerTitleFormat, { locale: dateFnsLocale })}</h1>
          <button type="button" className={MOBILE_TODAY_BUTTON_CLASS} onClick={handleToday} aria-label={t.todayButton}>{t.todayButton}</button>
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-zinc-100 hover:text-zinc-500" onClick={handleNext} aria-label={t.nextLabel}>›</button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MobileViewModeDropdown value={selectedViewMode} onChange={handleSelectViewMode} options={viewOptions} />
        </div>
      </div>
    </div>
  );

  const renderCalendarContent = () => {
    if (isYearCalendarView) return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarYearView yearDate={currentDate} selectedDate={selectedDate} visibleEvents={mainCalendarEvents} eventDisplayResolver={yearEventDisplayResolver} onSelectDate={handleMonthCellSelectDate} onRenderedRangeChange={handleYearRenderedRangeChange} onSyncRangeChange={handleYearSyncRangeChange} /></div></CarvePanel>;
    if (isListCalendarView) return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarListView days={visibleDays} virtualRail={virtualRail} events={mainCalendarEvents} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} onVisibleMonthChange={handleVisibleMonthChange} className={MOBILE_LIST_VIEW_CLASS} /></div></CarvePanel>;
    if (isTimetableCalendarView) return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarTimetableView weekDate={currentDate} density="compact" addRequestToken={timetableAddRequestToken} /></div></CarvePanel>;
    if (isPieChartCalendarView) return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarPieChartView days={visibleDays} selectedDate={selectedDate} events={mainCalendarEvents} appProjects={EMPTY_APP_PROJECTS} googleAccounts={googleAccountsWithColorOverridesForSidebar} onSelectDate={handleSidebarSelectDate} onVisibleDateChange={handleVisibleDateChange} /></div></CarvePanel>;
    if (isMonthCalendarView) return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn("schedule-mobile-month-surface", MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_MONTH_SURFACE_CLASS)}><CalendarMonthView currentDate={currentDate} selectedDate={selectedDate} scrollTargetToken={monthScrollTargetToken} visibleEvents={mainCalendarEvents} showEventTimeLabel={false} onSelectDate={handleSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onRenderedRangeChange={handleMonthRenderedRangeChange} onMoveCalendarEvent={handleMoveCalendarEvent} /></div></CarvePanel>;
    return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={mainCalendarEvents} calendarGridStyle={calendarGridStyle} onScroll={handleCalendarScroll} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} /></div></CarvePanel>;
  };

  return <div ref={contentViewportRef} className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-zinc-900"><style>{MOBILE_SCHEDULE_STYLE}</style><MobileCalendarSidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} /><MobileCalendarEventComposer isOpen={isEventComposerOpen} selectedDate={selectedDate} accounts={googleAccountsWithColorOverridesForSidebar} projectCalendarLinks={projectCalendarLinks} onClose={handleCloseEventComposer} onAddCalendar={addGoogleCalendar} onCreateEvent={createGoogleCalendarEvent} /><button type="button" className={MOBILE_ADD_EVENT_BUTTON_CLASS} onClick={handleAddScheduleItem} aria-label="新規予定を追加">{StratisPlusIcon ? <StratisPlusIcon className="h-7 w-7" aria-hidden="true" focusable="false" /> : null}</button><main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white p-0">{renderCalendarContent()}</main></div>;
};



export { ScheduleScreen };
