import { useCallback, useEffect, useMemo, useState } from "react";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@shared/i18n/useT";
import { addDays, endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import type { PlanResultMode } from "@/chip/toggle/Toggle.planresult";
import { CarvePanel, CarvePanelShell } from "@/components/panel/CarvePanel.desktop";
import { DEFAULT_MONTH_VISIBLE_EVENT_COUNT } from "@/features/calendar/calendar.constants.desktop";
import { createCalendarYearEventDisplayResolver } from "@/features/calendar/calendarEventSourcePriority";
import { attachCalendarEventDisplayMetadata, filterCalendarEventsBySourceVisibility } from "@/features/calendar/calendarEventVisibility";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarYearView } from "@/features/calendar/grid/CalendarView.year";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import { CalendarListView } from "@/features/calendar/list/CalendarListView.desktop";
import type { CalendarPrintRangeState } from "@/features/calendar/print/calendarPrint.types";
import { createCalendarPrintDateInputValue, getCalendarPrintRange, getCalendarPrintRangeLabel } from "@/features/calendar/print/calendarPrintRange.utils";
import { CalendarPrintRangeView } from "@/features/calendar/print/CalendarPrintRangeView.desktop";
import { useCalendarPrintController } from "@/features/calendar/print/useCalendarPrintController";
import { normalizeScheduleMonthVisibleEventCount, persistScheduleMonthVisibleEventCount, readStoredScheduleMonthVisibleEventCount } from "@/features/calendar/scheduleNavigationPersistence";
import type { CalendarAllDayEventOrderMap, CalendarAllDayEventReorderHandler, CalendarViewMode, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { CalendarTimetableView } from "@/features/calendar/timetable/CalendarTimetableView";
import { applyCalendarEventMoveOverrides, useCalendarEventMoveController } from "@/features/calendar/useCalendarEventMoveController";
import { useProjectCalendarActions } from "@/features/calendar/useProjectCalendarActions";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { createCalendarEventsScopeKey, useTransientEmptyCalendarEvents } from "@/features/calendar/useTransientEmptyCalendarEvents";
import { ScheduleScreenHeaderDesktop } from "@/features/header/ScheduleScreenHeader.desktop";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { CalendarPieChartView } from "@/pane.desktop/leftpane/schedule/Calendar.PieChartView";
import { CalendarSelectedViewsSplitView } from "@/pane.desktop/leftpane/schedule/Calendar.SelectedViewsSplitView.desktop";
import { CalendarSidebar } from "@/pane.desktop/leftpane/schedule/CalendarSidebar";
import { MobileCalendarEventComposer } from "./MobileCalendarEventComposer";

type CalendarEventDisplayRange = {
  start: Date; end: Date; };
type CalendarEventDisplayRangeOptions = {
  primaryViewMode: CalendarViewMode; currentDate: Date; selectedDate: Date; monthTitleDate: Date; visibleDays: Date[]; monthRenderedRange: CalendarDateRange; yearRenderedRange: CalendarDateRange | null; };

const IOS_CALENDAR_MONTH_SURFACE_CLASS = "border-transparent bg-[rgba(255,255,255,0.92)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";
const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const ALL_DAY_EVENT_ORDER_STORAGE_KEY = "flashcard-master:schedule:all-day-event-order";
const DEFAULT_PLAN_RESULT_MODES: readonly PlanResultMode[] = ["plan", "actual"];
const PLAN_RESULT_TOGGLE_VIEW_MODES = new Set(["threeDays", "days", "pieChart"]);
const LIST_AND_PIE_CHART_EVENT_BUFFER_DAYS = 45;
const WEEKDAY_EVENT_BUFFER_DAYS = 1;

const readStoredAllDayEventOrder = (): CalendarAllDayEventOrderMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ALL_DAY_EVENT_ORDER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const order: CalendarAllDayEventOrderMap = {};
    Object.entries(parsed).forEach(([dayKey, value]) => {
      if (Array.isArray(value) && value.every((item) => typeof item === "string")) order[dayKey] = value;
    });
    return order;
  } catch {
    return {};
  }
};
const persistAllDayEventOrder = (order: CalendarAllDayEventOrderMap) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALL_DAY_EVENT_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // localStorage が使えない環境では React state の状態だけ維持する。
  }
};
const buildDaysDisplayRange = (days: Date[], fallbackDate: Date, bufferDays: number): CalendarEventDisplayRange => ({ start: startOfDay(subDays(days[0] ?? fallbackDate, bufferDays)), end: endOfDay(addDays(days.at(-1) ?? fallbackDate, bufferDays)) });
const buildMonthAnchoredDisplayRange = (monthTitleDate: Date, bufferDays: number): CalendarEventDisplayRange => ({ start: startOfDay(subDays(startOfMonth(monthTitleDate), bufferDays)), end: endOfDay(addDays(endOfMonth(monthTitleDate), bufferDays)) });
const buildYearDisplayRange = (currentDate: Date, yearRenderedRange: CalendarDateRange | null): CalendarEventDisplayRange => {
  if (!yearRenderedRange) return { start: startOfDay(currentDate), end: endOfDay(currentDate) };

  return { start: startOfDay(yearRenderedRange.start), end: endOfDay(yearRenderedRange.end) };
};
const buildCalendarDateDisplayRange = (range: CalendarDateRange): CalendarEventDisplayRange => ({ start: startOfDay(range.start), end: endOfDay(range.end) });
const getScheduleEventDisplayRange = ({ primaryViewMode, currentDate, selectedDate, monthTitleDate, visibleDays, monthRenderedRange, yearRenderedRange }: CalendarEventDisplayRangeOptions): CalendarEventDisplayRange => {
  if (primaryViewMode === "year") return buildYearDisplayRange(currentDate, yearRenderedRange);
  if (primaryViewMode === "month") return buildCalendarDateDisplayRange(monthRenderedRange);
  if (primaryViewMode === "list") return buildMonthAnchoredDisplayRange(monthTitleDate, LIST_AND_PIE_CHART_EVENT_BUFFER_DAYS);
  if (primaryViewMode === "pieChart") return buildDaysDisplayRange(visibleDays, selectedDate, LIST_AND_PIE_CHART_EVENT_BUFFER_DAYS);
  return buildDaysDisplayRange(visibleDays, selectedDate, WEEKDAY_EVENT_BUFFER_DAYS);
};
const eventOverlapsDisplayRange = (event: GoogleCalendarEvent, range: CalendarEventDisplayRange): boolean => event.startsAt <= range.end && event.endsAt >= range.start;
const filterEventsByDisplayRange = (events: GoogleCalendarEvent[], range: CalendarEventDisplayRange): GoogleCalendarEvent[] => events.filter((event) => eventOverlapsDisplayRange(event, range));
const createInitialCalendarPrintRange = (date: Date): CalendarPrintRangeState => {
  const dateValue = createCalendarPrintDateInputValue(date);

  return { mode: "current", customStartDate: dateValue, customEndDate: dateValue };
};
const createInitialMonthVisibleEventCount = (): number => readStoredScheduleMonthVisibleEventCount() ?? DEFAULT_MONTH_VISIBLE_EVENT_COUNT;

const ScheduleScreen = ({ isLeftPanelCollapsed = false, onClose: _onClose }: ScheduleScreenProps) => {
  const pane = useScheduleScreen();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const [allDayEventOrder, setAllDayEventOrder] = useState<CalendarAllDayEventOrderMap>(readStoredAllDayEventOrder);
  const [planResultModes, setPlanResultModes] = useState<PlanResultMode[]>([...DEFAULT_PLAN_RESULT_MODES]);
  const [printRange, setPrintRange] = useState<CalendarPrintRangeState>(() => createInitialCalendarPrintRange(new Date()));
  const [monthVisibleEventCount, setMonthVisibleEventCount] = useState(createInitialMonthVisibleEventCount);
  const [isEventComposerOpen, setIsEventComposerOpen] = useState(false);
  const [timetableAddRequestToken, setTimetableAddRequestToken] = useState(0);
  const viewOptions = useMemo(() => [{ value: "year", label: t.viewYear }, { value: "month", label: t.viewMonth }, { value: "week", label: t.viewWeek }, { value: "threeDays", label: t.viewThreeDays }, { value: "days", label: t.viewDay }, { value: "list", label: t.viewList }, { value: "timetable", label: t.viewTimetable }, { value: "pieChart", label: t.viewPieChart }] as const, [t.viewDay, t.viewList, t.viewMonth, t.viewPieChart, t.viewThreeDays, t.viewTimetable, t.viewWeek, t.viewYear]);
  const { selectedViewMode, primaryViewMode, weekStartDay, currentDate, selectedDate, titleDate, monthTitleDate, monthScrollTargetToken, visibleDays, virtualRail, yearRenderedRange, googleCalendarEvents, googleAccounts, isAnyCalendarConnecting, calendarGridStyle, headerScrollRef, allDayScrollRef, scrollContainerRef, contentViewportRef, handleCalendarScroll, handleSelectViewMode, handleSidebarSelectDate, handleVisibleDateChange, handleVisibleMonthChange, handlePrevious, handleNext, handleToday, handleMonthCellSelectDate, handleMonthRenderedRangeChange, handleYearRenderedRangeChange, handleYearSyncRangeChange, addGoogleCalendar, reconnectGoogleAccount, toggleGoogleCalendar, syncGoogleCalendarRange, createGoogleCalendarEvent, updateGoogleCalendarEvent } = pane;
  const { calendarEventMoveOverrides, handleMoveCalendarEvent } = useCalendarEventMoveController({ updateGoogleCalendarEvent });
  const { appProjects, projectCalendarLinks, googleCalendarColorOverrides, googleAccountsWithColorOverrides, handleAddAppProject, handleToggleAppProject, handleLinkGoogleCalendarAsProject, handleLinkProjectToGoogleCalendar, handleCreateProjectGoogleCalendar, handleUnlinkProjectCalendar, handleChangeGoogleCalendarColor } = useProjectCalendarActions({ googleAccounts, reconnectGoogleAccount, toggleGoogleCalendar });

  useEffect(() => {
    persistAllDayEventOrder(allDayEventOrder); }, [allDayEventOrder]);
  useEffect(() => {
    persistScheduleMonthVisibleEventCount(monthVisibleEventCount); }, [monthVisibleEventCount]);

  const handleReorderAllDayEvents = useCallback<CalendarAllDayEventReorderHandler>(({ eventKey, sourceDayKey, targetDayKey, orderedEventKeys }) => {
    setAllDayEventOrder((order) => {
      const next = { ...order, [targetDayKey]: orderedEventKeys };

      if (sourceDayKey !== targetDayKey) {
        const sourceOrder = order[sourceDayKey]?.filter((key) => key !== eventKey);
        if (sourceOrder && sourceOrder.length > 0) next[sourceDayKey] = sourceOrder;
        else delete next[sourceDayKey];
      }

      return next;
    });
  }, []);

  const handleChangeMonthVisibleEventCount = useCallback((value: number) => {
    setMonthVisibleEventCount(normalizeScheduleMonthVisibleEventCount(value));
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

  const yearEventDisplayResolver = useMemo(() => createCalendarYearEventDisplayResolver({ appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverrides }), [appProjects, googleAccountsWithColorOverrides, projectCalendarLinks]);
  const linkedGoogleCalendarEvents = useMemo(() => attachCalendarEventDisplayMetadata(googleCalendarEvents, { appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverrides, googleCalendarColorOverrides }), [appProjects, googleAccountsWithColorOverrides, googleCalendarColorOverrides, googleCalendarEvents, projectCalendarLinks]);
  const overriddenGoogleCalendarEvents = useMemo(() => applyCalendarEventMoveOverrides(linkedGoogleCalendarEvents, calendarEventMoveOverrides), [calendarEventMoveOverrides, linkedGoogleCalendarEvents]);
  const visibleGoogleCalendarEvents = useMemo(() => filterCalendarEventsBySourceVisibility(overriddenGoogleCalendarEvents, { appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverrides }), [appProjects, googleAccountsWithColorOverrides, overriddenGoogleCalendarEvents, projectCalendarLinks]);
  const selectedViewModes = useMemo(() => Array.isArray(selectedViewMode) ? selectedViewMode : [selectedViewMode], [selectedViewMode]);
  const mainDisplayRange = useMemo(() => getScheduleEventDisplayRange({ primaryViewMode, currentDate, selectedDate, monthTitleDate, visibleDays, monthRenderedRange: pane.monthRenderedRange, yearRenderedRange }), [currentDate, monthTitleDate, pane.monthRenderedRange, primaryViewMode, selectedDate, visibleDays, yearRenderedRange]);
  const mainDisplayRangeKey = useMemo(() => createCalendarEventsScopeKey(mainDisplayRange.start, mainDisplayRange.end), [mainDisplayRange]);
  const printDisplayRange = useMemo(() => getCalendarPrintRange({ printRange, primaryViewMode, currentDate, selectedDate, visibleDays, currentDisplayRange: mainDisplayRange, weekStartDay }), [currentDate, mainDisplayRange, primaryViewMode, printRange, selectedDate, visibleDays, weekStartDay]);
  const rawMainCalendarEvents = useMemo(() => filterEventsByDisplayRange(visibleGoogleCalendarEvents, mainDisplayRange), [mainDisplayRange, visibleGoogleCalendarEvents]);
  const mainCalendarEvents = useTransientEmptyCalendarEvents(rawMainCalendarEvents, mainDisplayRangeKey);
  const printCalendarEvents = useMemo(() => filterEventsByDisplayRange(visibleGoogleCalendarEvents, printDisplayRange), [printDisplayRange, visibleGoogleCalendarEvents]);
  const isListCalendarView = selectedViewModes.includes("list");
  const isPieChartCalendarView = selectedViewModes.includes("pieChart");
  const isSplitCalendarView = selectedViewModes.length > 1;
  const isTimetableCalendarView = primaryViewMode === "timetable";
  const isYearCalendarView = primaryViewMode === "year";
  const isMonthCalendarView = primaryViewMode === "month";
  const canShowPlanResultToggle = selectedViewModes.some((mode) => PLAN_RESULT_TOGGLE_VIEW_MODES.has(mode));
  const headerTitleDate = isSplitCalendarView ? selectedDate : primaryViewMode === "month" || isListCalendarView ? monthTitleDate : isPieChartCalendarView ? selectedDate : titleDate;
  const headerTitleLabel = primaryViewMode === "year" ? format(headerTitleDate, "yyyy年", { locale: dateFnsLocale }) : format(headerTitleDate, isPieChartCalendarView || isSplitCalendarView ? "yyyy年M月d日" : monthLabelFormat, { locale: dateFnsLocale });
  const printRangeLabel = useMemo(() => getCalendarPrintRangeLabel(printDisplayRange, printRange.mode, primaryViewMode), [primaryViewMode, printDisplayRange, printRange.mode]);

  const handleBeforePrintCalendar = useCallback(async () => {
    await syncGoogleCalendarRange(printDisplayRange);
  }, [printDisplayRange, syncGoogleCalendarRange]);

  const handlePrintCalendarError = useCallback((error: unknown) => {
    console.warn("[ScheduleScreen] Google Calendar print sync failed", error);
  }, []);

  const { isPrintPanelActive: isCalendarPrintPanelActive, requestPrint: handlePrintCalendar } = useCalendarPrintController({ onBeforePrint: handleBeforePrintCalendar, onPrintError: handlePrintCalendarError });

  const handleAddScheduleItem = useCallback(() => {
    if (isTimetableCalendarView) {
      handleRequestTimetableAdd();
      return;
    }

    handleOpenEventComposer();
  }, [handleOpenEventComposer, handleRequestTimetableAdd, isTimetableCalendarView]);

  return (
    <CarvePanelShell isLeftPanelCollapsed={isLeftPanelCollapsed} leftPanel={<CalendarSidebar appProjects={appProjects} projectCalendarLinks={projectCalendarLinks} googleCalendarColorOverrides={googleCalendarColorOverrides} googleAccounts={googleAccountsWithColorOverrides} isAnyCalendarConnecting={isAnyCalendarConnecting} onAddCalendar={addGoogleCalendar} onAddProject={handleAddAppProject} onToggleProject={handleToggleAppProject} onLinkGoogleCalendarAsProject={handleLinkGoogleCalendarAsProject} onLinkProjectToGoogleCalendar={handleLinkProjectToGoogleCalendar} onCreateProjectGoogleCalendar={handleCreateProjectGoogleCalendar} onUnlinkProjectCalendar={handleUnlinkProjectCalendar} onChangeGoogleCalendarColor={handleChangeGoogleCalendarColor} onReconnectAccount={(accountId) => {
      void reconnectGoogleAccount(accountId); }} onToggleCalendar={toggleGoogleCalendar}
    />} viewportRef={contentViewportRef}
    >
      <CarvePanel>
        <div className="flex min-h-0 flex-1 flex-col">
          <ScheduleScreenHeaderDesktop titleLabel={headerTitleLabel} selectedViewMode={selectedViewMode} viewOptions={viewOptions} planResultModes={planResultModes} showPlanResultToggle={canShowPlanResultToggle} showMonthEventCountControl={isMonthCalendarView} monthVisibleEventCount={monthVisibleEventCount} printRange={printRange} onSelectViewMode={handleSelectViewMode} onChangePlanResultModes={setPlanResultModes} onChangeMonthVisibleEventCount={handleChangeMonthVisibleEventCount} onChangePrintRange={setPrintRange} onAddEvent={handleAddScheduleItem} onPrintCalendar={handlePrintCalendar} onPrevious={handlePrevious} onNext={handleNext} onToday={handleToday} className="mb-2 flex shrink-0 items-center justify-between px-5 pt-4" />
          <div className="calendar-print-screen-content flex min-h-0 flex-1 flex-col">
            {isYearCalendarView ? (
              <div className="ml-4 mr-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-white"><CalendarYearView yearDate={currentDate} selectedDate={selectedDate} weekStartDay={weekStartDay} visibleEvents={mainCalendarEvents} eventDisplayResolver={yearEventDisplayResolver} onSelectDate={handleMonthCellSelectDate} onRenderedRangeChange={handleYearRenderedRangeChange} onSyncRangeChange={handleYearSyncRangeChange} /></div>
            ) : isSplitCalendarView ? (
              <CalendarSelectedViewsSplitView selectedViewModes={selectedViewModes} currentDate={currentDate} selectedDate={selectedDate} weekStartDay={weekStartDay} visibleDays={visibleDays} virtualRail={virtualRail} events={mainCalendarEvents} appProjects={appProjects} googleAccounts={googleAccountsWithColorOverrides} headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} calendarGridStyle={calendarGridStyle} allDayEventOrder={allDayEventOrder} onCalendarScroll={handleCalendarScroll} onSelectDate={handleSidebarSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onVisibleDateChange={handleVisibleDateChange} onMoveCalendarEvent={handleMoveCalendarEvent} onReorderAllDayEvents={handleReorderAllDayEvents} />
            ) : isPieChartCalendarView ? (
              <div className="ml-4 mr-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-white"><CalendarPieChartView days={visibleDays} virtualRail={virtualRail} selectedDate={selectedDate} events={mainCalendarEvents} appProjects={appProjects} googleAccounts={googleAccountsWithColorOverrides} onSelectDate={handleSidebarSelectDate} onVisibleDateChange={handleVisibleDateChange} /></div>
            ) : isListCalendarView ? (
              <div className="ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-white"><CalendarListView days={visibleDays} virtualRail={virtualRail} events={mainCalendarEvents} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} onVisibleMonthChange={handleVisibleMonthChange} /></div>
            ) : isMonthCalendarView ? (
              <div className={cn("ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-r-0", IOS_CALENDAR_MONTH_SURFACE_CLASS)}><CalendarMonthView currentDate={currentDate} selectedDate={selectedDate} weekStartDay={weekStartDay} scrollTargetToken={monthScrollTargetToken} visibleEvents={mainCalendarEvents} monthVisibleEventCount={monthVisibleEventCount} onSelectDate={handleMonthCellSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onRenderedRangeChange={handleMonthRenderedRangeChange} onMoveCalendarEvent={handleMoveCalendarEvent} /></div>
            ) : isTimetableCalendarView ? (
              <div className="ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-white"><CalendarTimetableView weekDate={currentDate} weekStartDay={weekStartDay} addRequestToken={timetableAddRequestToken} /></div>
            ) : (
              <div className={cn("ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0", IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={mainCalendarEvents} calendarGridStyle={calendarGridStyle} allDayEventOrder={allDayEventOrder} onScroll={handleCalendarScroll} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} onMoveCalendarEvent={handleMoveCalendarEvent} onReorderAllDayEvents={handleReorderAllDayEvents} /></div>
            )}
          </div>
          {isCalendarPrintPanelActive && <CalendarPrintRangeView titleLabel={headerTitleLabel} rangeLabel={printRangeLabel} focusDate={currentDate} range={printDisplayRange} events={printCalendarEvents} />}
          <MobileCalendarEventComposer isOpen={isEventComposerOpen} selectedDate={selectedDate} googleAccounts={googleAccountsWithColorOverrides} onCreateEvent={createGoogleCalendarEvent} onClose={handleCloseEventComposer} />
        </div>
      </CarvePanel>
    </CarvePanelShell>
  );
};

export { ScheduleScreen };
