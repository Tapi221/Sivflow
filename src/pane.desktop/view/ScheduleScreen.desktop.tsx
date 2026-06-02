import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfDay, format, startOfDay, subDays } from "date-fns";
import type { PlanResultMode } from "@/chip/toggle/Toggle.planresult";
import { CarvePanel, CarvePanelShell } from "@/components/panel/CarvePanel.desktop";
import { DEFAULT_MONTH_VISIBLE_EVENT_COUNT } from "@/features/calendar/calendar.constants.desktop";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { attachCalendarEventDisplayMetadata, filterCalendarEventsBySourceVisibility } from "@/features/calendar/calendarEventVisibility";
import { createCalendarYearEventDisplayResolver } from "@/features/calendar/calendarEventSourcePriority";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarYearView } from "@/features/calendar/grid/CalendarView.year";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import { CalendarListView } from "@/features/calendar/list/CalendarListView.desktop";
import { CalendarPrintRangeView } from "@/features/calendar/print/CalendarPrintRangeView.desktop";
import type { CalendarPrintRangeState } from "@/features/calendar/print/calendarPrint.types";
import { createCalendarPrintDateInputValue, getCalendarPrintRange, getCalendarPrintRangeLabel } from "@/features/calendar/print/calendarPrintRange.utils";
import { useCalendarPrintController } from "@/features/calendar/print/useCalendarPrintController";
import { createProjectCalendarLink, persistProjectCalendarLinks, readStoredProjectCalendarLinks } from "@/features/calendar/projectCalendarLinks.storage";
import { normalizeScheduleMonthVisibleEventCount, persistScheduleMonthVisibleEventCount, readStoredScheduleMonthVisibleEventCount } from "@/features/calendar/scheduleNavigationPersistence";
import type { AppCalendarItem, CalendarAllDayEventOrderMap, CalendarAllDayEventReorderHandler, CalendarViewMode, GoogleAccountDisplay, GoogleCalendarColorOverrideMap, ProjectCalendarLink, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { CalendarTimetableView } from "@/features/calendar/timetable/CalendarTimetableView";
import { applyCalendarEventMoveOverrides, useCalendarEventMoveController } from "@/features/calendar/useCalendarEventMoveController";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { clearLegacyStoredAppProjects, normalizeRootFolderProjectLabel, readLegacyStoredAppProjects, useRootFolderProjects } from "@/features/calendar/useRootFolderProjects";
import { ScheduleScreenHeaderDesktop } from "@/features/header/ScheduleScreenHeader.desktop";
import { createGoogleCalendar } from "@/integration/googlecalendar-integration/gcal.api";
import type { GoogleCalendarEvent, GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { CalendarSidebar } from "@/pane.desktop/leftpane/schedule/CalendarSidebar";
import { CalendarPieChartView } from "@/pane.desktop/leftpane/schedule/Calendar.PieChartView";
import { CalendarSelectedViewsSplitView } from "@/pane.desktop/leftpane/schedule/Calendar.SelectedViewsSplitView.desktop";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@shared/i18n/useT";

type CalendarEventDisplayRange = { start: Date; end: Date };

type CalendarEventDisplayRangeOptions = { primaryViewMode: CalendarViewMode; currentDate: Date; selectedDate: Date; visibleDays: Date[]; monthRenderedRange: CalendarDateRange | null; yearRenderedRange: CalendarDateRange | null };

type CreateGoogleProjectCalendarLinkInput = { project: AppCalendarItem; accountId: string; calendar: GoogleCalendarListItem; color: string; createdByApp: boolean };

const IOS_CALENDAR_MONTH_SURFACE_CLASS = "border-transparent bg-[rgba(255,255,255,0.92)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";
const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const GOOGLE_CALENDAR_COLOR_OVERRIDES_STORAGE_KEY = "flashcard-master:schedule:google-calendar-color-overrides";
const ALL_DAY_EVENT_ORDER_STORAGE_KEY = "flashcard-master:schedule:all-day-event-order";
const DEFAULT_PLAN_RESULT_MODES: readonly PlanResultMode[] = ["plan", "actual"];
const PLAN_RESULT_TOGGLE_VIEW_MODES = new Set(["threeDays", "days", "pieChart"]);
const LIST_AND_PIE_CHART_EVENT_BUFFER_DAYS = 45;
const WEEKDAY_EVENT_BUFFER_DAYS = 1;
const MONTH_EVENT_BUFFER_DAYS = 14;

const isHexColor = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value);

const createGoogleCalendarColorOverrideKey = (accountId: string, calendarId: string): string => `${accountId}:${calendarId}`;

const readStoredGoogleCalendarColorOverrides = (): GoogleCalendarColorOverrideMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GOOGLE_CALENDAR_COLOR_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const overrides: GoogleCalendarColorOverrideMap = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === "string" && isHexColor(value)) overrides[key] = value;
    });
    return overrides;
  } catch {
    return {};
  }
};

const persistGoogleCalendarColorOverrides = (overrides: GoogleCalendarColorOverrideMap) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GOOGLE_CALENDAR_COLOR_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage が使えない環境では React state の状態だけ維持する。
  }
};

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

const applyGoogleCalendarColorOverridesToAccounts = (accounts: GoogleAccountDisplay[], overrides: GoogleCalendarColorOverrideMap): GoogleAccountDisplay[] => accounts.map((account) => ({ ...account, calendars: account.calendars.map((calendar) => ({ ...calendar, backgroundColor: overrides[createGoogleCalendarColorOverrideKey(account.accountId, calendar.id)] ?? calendar.backgroundColor })) }));

const buildDaysDisplayRange = (days: Date[], fallbackDate: Date, bufferDays: number): CalendarEventDisplayRange => ({ start: startOfDay(subDays(days[0] ?? fallbackDate, bufferDays)), end: endOfDay(addDays(days.at(-1) ?? fallbackDate, bufferDays)) });

const buildYearDisplayRange = (currentDate: Date, yearRenderedRange: CalendarDateRange | null): CalendarEventDisplayRange => {
  if (!yearRenderedRange) return { start: startOfDay(currentDate), end: endOfDay(currentDate) };

  return { start: startOfDay(yearRenderedRange.start), end: endOfDay(yearRenderedRange.end) };
};

const buildCalendarDateDisplayRange = (range: CalendarDateRange): CalendarEventDisplayRange => ({ start: startOfDay(range.start), end: endOfDay(range.end) });

const getScheduleEventDisplayRange = ({ primaryViewMode, currentDate, selectedDate, visibleDays, monthRenderedRange, yearRenderedRange }: CalendarEventDisplayRangeOptions): CalendarEventDisplayRange => {
  if (primaryViewMode === "year") return buildYearDisplayRange(currentDate, yearRenderedRange);
  if (primaryViewMode === "month") return monthRenderedRange ? buildCalendarDateDisplayRange(monthRenderedRange) : buildDaysDisplayRange(visibleDays, currentDate, MONTH_EVENT_BUFFER_DAYS);
  if (primaryViewMode === "list" || primaryViewMode === "pieChart") return buildDaysDisplayRange(visibleDays, selectedDate, LIST_AND_PIE_CHART_EVENT_BUFFER_DAYS);
  return buildDaysDisplayRange(visibleDays, selectedDate, WEEKDAY_EVENT_BUFFER_DAYS);
};

const eventOverlapsDisplayRange = (event: GoogleCalendarEvent, range: CalendarEventDisplayRange): boolean => event.startsAt <= range.end && event.endsAt >= range.start;

const filterEventsByDisplayRange = (events: GoogleCalendarEvent[], range: CalendarEventDisplayRange): GoogleCalendarEvent[] => events.filter((event) => eventOverlapsDisplayRange(event, range));

const createGoogleProjectCalendarLink = ({ project, accountId, calendar, color, createdByApp }: CreateGoogleProjectCalendarLinkInput): ProjectCalendarLink => createProjectCalendarLink({ projectId: project.id, provider: "google", accountId, externalCalendarId: calendar.id, externalCalendarName: calendar.summaryOverride ?? calendar.summary, syncDirection: "importOnly", createdByApp, color, lastSyncedAt: new Date().toISOString() });

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
  const didMigrateLegacyProjectsRef = useRef(false);
  const { appProjects, loading: rootFolderProjectsLoading, createRootFolderProject, findProjectByLabel, setProjectVisibility, toggleProject, updateRootFolderProjectColor } = useRootFolderProjects();
  const [projectCalendarLinks, setProjectCalendarLinks] = useState<ProjectCalendarLink[]>(readStoredProjectCalendarLinks);
  const [googleCalendarColorOverrides, setGoogleCalendarColorOverrides] = useState<GoogleCalendarColorOverrideMap>(readStoredGoogleCalendarColorOverrides);
  const [allDayEventOrder, setAllDayEventOrder] = useState<CalendarAllDayEventOrderMap>(readStoredAllDayEventOrder);
  const [planResultModes, setPlanResultModes] = useState<PlanResultMode[]>([...DEFAULT_PLAN_RESULT_MODES]);
  const [printRange, setPrintRange] = useState<CalendarPrintRangeState>(() => createInitialCalendarPrintRange(new Date()));
  const [monthVisibleEventCount, setMonthVisibleEventCount] = useState(createInitialMonthVisibleEventCount);
  const viewOptions = useMemo(() => [{ value: "year", label: t.viewYear }, { value: "month", label: t.viewMonth }, { value: "week", label: t.viewWeek }, { value: "threeDays", label: t.viewThreeDays }, { value: "days", label: t.viewDay }, { value: "list", label: t.viewList }, { value: "timetable", label: t.viewTimetable }, { value: "pieChart", label: t.viewPieChart }] as const, [t.viewDay, t.viewList, t.viewMonth, t.viewPieChart, t.viewThreeDays, t.viewTimetable, t.viewWeek, t.viewYear]);
  const { selectedViewMode, primaryViewMode, currentDate, selectedDate, titleDate, monthTitleDate, monthScrollTargetToken, visibleDays, virtualRail, yearRenderedRange, googleCalendarEvents, googleAccounts, isAnyCalendarConnecting, calendarGridStyle, headerScrollRef, allDayScrollRef, scrollContainerRef, contentViewportRef, handleCalendarScroll, handleSelectViewMode, handleSidebarSelectDate, handleVisibleDateChange, handleVisibleMonthChange, handlePrevious, handleNext, handleToday, handleMonthCellSelectDate, handleMonthRenderedRangeChange, handleYearRenderedRangeChange, handleYearSyncRangeChange, addGoogleCalendar, reconnectGoogleAccount, toggleGoogleCalendar, syncGoogleCalendarRange, updateGoogleCalendarEvent } = pane;
  const { calendarEventMoveOverrides, handleMoveCalendarEvent } = useCalendarEventMoveController({ updateGoogleCalendarEvent });

  useEffect(() => { persistProjectCalendarLinks(projectCalendarLinks); }, [projectCalendarLinks]);
  useEffect(() => { persistGoogleCalendarColorOverrides(googleCalendarColorOverrides); }, [googleCalendarColorOverrides]);
  useEffect(() => { persistAllDayEventOrder(allDayEventOrder); }, [allDayEventOrder]);
  useEffect(() => { persistScheduleMonthVisibleEventCount(monthVisibleEventCount); }, [monthVisibleEventCount]);
  useEffect(() => {
    if (didMigrateLegacyProjectsRef.current || rootFolderProjectsLoading) return;
    const legacyProjects = readLegacyStoredAppProjects();
    if (legacyProjects.length === 0) return;
    didMigrateLegacyProjectsRef.current = true;
    void (async () => {
      const migratedProjectByLegacyId = new Map<string, AppCalendarItem>();
      const migratedProjectByNormalizedLabel = new Map(appProjects.map((project) => [normalizeRootFolderProjectLabel(project.label), project]));
      for (const legacyProject of legacyProjects) {
        const normalizedLabel = normalizeRootFolderProjectLabel(legacyProject.label);
        const existingProject = migratedProjectByNormalizedLabel.get(normalizedLabel) ?? findProjectByLabel(legacyProject.label);
        const project = existingProject ?? await createRootFolderProject({ label: legacyProject.label, color: legacyProject.color, checked: legacyProject.checked });
        if (!project) continue;
        migratedProjectByLegacyId.set(legacyProject.id, project);
        migratedProjectByNormalizedLabel.set(normalizedLabel, project);
        setProjectVisibility(project.id, legacyProject.checked);
      }
      if (migratedProjectByLegacyId.size > 0) {
        setProjectCalendarLinks((links) => links.map((link) => {
          const migratedProject = migratedProjectByLegacyId.get(link.projectId);
          return migratedProject ? { ...link, projectId: migratedProject.id, color: link.color ?? migratedProject.color } : link;
        }));
      }
      clearLegacyStoredAppProjects();
    })().catch((error) => {
      didMigrateLegacyProjectsRef.current = false;
      console.warn("[ScheduleScreen] legacy app project migration failed", error);
    });
  }, [appProjects, createRootFolderProject, findProjectByLabel, rootFolderProjectsLoading, setProjectVisibility]);

  const handleAddAppProject = useCallback((projectName: string) => { void createRootFolderProject({ label: projectName, checked: true }); }, [createRootFolderProject]);
  const handleToggleAppProject = useCallback((projectId: string) => { toggleProject(projectId); }, [toggleProject]);
  const linkProjectToGoogleCalendar = useCallback((project: AppCalendarItem, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem, createdByApp: boolean) => {
    const color = googleCalendarColorOverrides[createGoogleCalendarColorOverrideKey(account.accountId, calendar.id)] ?? calendar.backgroundColor ?? project.color;
    const link = createGoogleProjectCalendarLink({ project, accountId: account.accountId, calendar, color, createdByApp });
    setProjectVisibility(project.id, true);
    void updateRootFolderProjectColor(project.id, color);
    setProjectCalendarLinks((links) => links.some((item) => item.id === link.id) ? links.map((item) => item.id === link.id ? { ...item, ...link, projectId: project.id } : item) : [...links, link]);
    if (!account.selectedCalendarIds.has(calendar.id)) toggleGoogleCalendar(account.accountId, calendar.id);
  }, [googleCalendarColorOverrides, setProjectVisibility, toggleGoogleCalendar, updateRootFolderProjectColor]);
  const handleLinkProjectToGoogleCalendar = useCallback((projectId: string, accountId: string, calendarId: string) => {
    const project = appProjects.find((item) => item.id === projectId);
    const account = googleAccounts.find((item) => item.accountId === accountId);
    const calendar = account?.calendars.find((item) => item.id === calendarId);
    if (project && account && calendar) linkProjectToGoogleCalendar(project, account, calendar, false);
  }, [appProjects, googleAccounts, linkProjectToGoogleCalendar]);
  const handleCreateProjectGoogleCalendar = useCallback((projectId: string, accountId: string) => {
    void (async () => {
      const project = appProjects.find((item) => item.id === projectId);
      const account = googleAccounts.find((item) => item.accountId === accountId);
      if (!project || !account) return;
      if (!account.accessToken) {
        void reconnectGoogleAccount(accountId);
        return;
      }
      const calendar = await createGoogleCalendar({ accessToken: account.accessToken, summary: project.label });
      linkProjectToGoogleCalendar(project, { ...account, calendars: [...account.calendars, calendar] }, calendar, true);
    })().catch((error) => { console.warn("[ScheduleScreen] Google Calendar creation failed", error); });
  }, [appProjects, googleAccounts, linkProjectToGoogleCalendar, reconnectGoogleAccount]);
  const handleLinkGoogleCalendarAsProject = useCallback((accountId: string, calendarId: string) => {
    void (async () => {
      const account = googleAccounts.find((item) => item.accountId === accountId);
      const calendar = account?.calendars.find((item) => item.id === calendarId);
      if (!account || !calendar) return;
      const calendarLabel = calendar.summaryOverride ?? calendar.summary;
      const color = googleCalendarColorOverrides[createGoogleCalendarColorOverrideKey(account.accountId, calendar.id)] ?? calendar.backgroundColor;
      const project = findProjectByLabel(calendarLabel) ?? await createRootFolderProject({ label: calendarLabel, color, checked: true });
      if (project) linkProjectToGoogleCalendar(project, account, calendar, false);
    })().catch((error) => { console.warn("[ScheduleScreen] Google Calendar project link failed", error); });
  }, [createRootFolderProject, findProjectByLabel, googleAccounts, googleCalendarColorOverrides, linkProjectToGoogleCalendar]);
  const handleUnlinkProjectCalendar = useCallback((linkId: string) => { setProjectCalendarLinks((links) => links.filter((link) => link.id !== linkId)); }, []);
  const handleChangeGoogleCalendarColor = useCallback((accountId: string, calendarId: string, color: string) => {
    if (!isHexColor(color)) return;
    const key = createGoogleCalendarColorOverrideKey(accountId, calendarId);
    const linkedProjectIds = projectCalendarLinks.filter((link) => link.provider === "google" && link.accountId === accountId && link.externalCalendarId === calendarId).map((link) => link.projectId);
    setGoogleCalendarColorOverrides((overrides) => ({ ...overrides, [key]: color }));
    setProjectCalendarLinks((links) => links.map((link) => link.provider === "google" && link.accountId === accountId && link.externalCalendarId === calendarId ? { ...link, color } : link));
    void Promise.all(Array.from(new Set(linkedProjectIds)).map((projectId) => updateRootFolderProjectColor(projectId, color))).catch((error) => { console.warn("[ScheduleScreen] root folder project color update failed", error); });
  }, [projectCalendarLinks, updateRootFolderProjectColor]);
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

  const googleAccountsWithColorOverrides = useMemo(() => applyGoogleCalendarColorOverridesToAccounts(googleAccounts, googleCalendarColorOverrides), [googleAccounts, googleCalendarColorOverrides]);
  const yearEventDisplayResolver = useMemo(() => createCalendarYearEventDisplayResolver({ appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverrides }), [appProjects, googleAccountsWithColorOverrides, projectCalendarLinks]);
  const linkedGoogleCalendarEvents = useMemo(() => attachCalendarEventDisplayMetadata(googleCalendarEvents, { appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverrides, googleCalendarColorOverrides }), [appProjects, googleAccountsWithColorOverrides, googleCalendarColorOverrides, googleCalendarEvents, projectCalendarLinks]);
  const overriddenGoogleCalendarEvents = useMemo(() => applyCalendarEventMoveOverrides(linkedGoogleCalendarEvents, calendarEventMoveOverrides), [calendarEventMoveOverrides, linkedGoogleCalendarEvents]);
  const visibleGoogleCalendarEvents = useMemo(() => filterCalendarEventsBySourceVisibility(overriddenGoogleCalendarEvents, { appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverrides }), [appProjects, googleAccountsWithColorOverrides, overriddenGoogleCalendarEvents, projectCalendarLinks]);
  const selectedViewModes = useMemo(() => Array.isArray(selectedViewMode) ? selectedViewMode : [selectedViewMode], [selectedViewMode]);
  const mainDisplayRange = useMemo(() => getScheduleEventDisplayRange({ primaryViewMode, currentDate, selectedDate, visibleDays, monthRenderedRange: pane.monthRenderedRange, yearRenderedRange }), [currentDate, pane.monthRenderedRange, primaryViewMode, selectedDate, visibleDays, yearRenderedRange]);
  const printDisplayRange = useMemo(() => getCalendarPrintRange({ printRange, primaryViewMode, currentDate, selectedDate, visibleDays, currentDisplayRange: mainDisplayRange }), [currentDate, mainDisplayRange, primaryViewMode, printRange, selectedDate, visibleDays]);
  const mainCalendarEvents = useMemo(() => filterEventsByDisplayRange(visibleGoogleCalendarEvents, mainDisplayRange), [mainDisplayRange, visibleGoogleCalendarEvents]);
  const printCalendarEvents = useMemo(() => filterEventsByDisplayRange(visibleGoogleCalendarEvents, printDisplayRange), [printDisplayRange, visibleGoogleCalendarEvents]);
  const isCalendarPrintRangeMode = printRange.mode !== "current";
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
  const { isPrintPanelActive: isCalendarPrintPanelActive, printPanelClassName: calendarPrintPanelClassName, requestPrint: handlePrintCalendar } = useCalendarPrintController({ onBeforePrint: handleBeforePrintCalendar, onPrintError: handlePrintCalendarError });

  return (
    <CarvePanelShell isLeftPanelCollapsed={isLeftPanelCollapsed} leftPanel={<CalendarSidebar appProjects={appProjects} projectCalendarLinks={projectCalendarLinks} googleCalendarColorOverrides={googleCalendarColorOverrides} googleAccounts={googleAccountsWithColorOverrides} isAnyCalendarConnecting={isAnyCalendarConnecting} onAddCalendar={addGoogleCalendar} onAddProject={handleAddAppProject} onToggleProject={handleToggleAppProject} onLinkGoogleCalendarAsProject={handleLinkGoogleCalendarAsProject} onLinkProjectToGoogleCalendar={handleLinkProjectToGoogleCalendar} onCreateProjectGoogleCalendar={handleCreateProjectGoogleCalendar} onUnlinkProjectCalendar={handleUnlinkProjectCalendar} onChangeGoogleCalendarColor={handleChangeGoogleCalendarColor} onReconnectAccount={(accountId) => { void reconnectGoogleAccount(accountId); }} onToggleCalendar={toggleGoogleCalendar} />} viewportRef={contentViewportRef}>
      <CarvePanel>
        <div className={cn("flex min-h-0 flex-1 flex-col", calendarPrintPanelClassName, isCalendarPrintRangeMode && "calendar-print-range-mode")}>
          <ScheduleScreenHeaderDesktop titleLabel={headerTitleLabel} selectedViewMode={selectedViewMode} viewOptions={viewOptions} planResultModes={planResultModes} showPlanResultToggle={canShowPlanResultToggle} showMonthEventCountControl={isMonthCalendarView} monthVisibleEventCount={monthVisibleEventCount} printRange={printRange} onSelectViewMode={handleSelectViewMode} onChangePlanResultModes={setPlanResultModes} onChangeMonthVisibleEventCount={handleChangeMonthVisibleEventCount} onChangePrintRange={setPrintRange} onPrintCalendar={handlePrintCalendar} onPrevious={handlePrevious} onNext={handleNext} onToday={handleToday} className="mb-2 flex shrink-0 items-center justify-between px-5 pt-4" />
          <div className="calendar-print-screen-content flex min-h-0 flex-1 flex-col">
            {isYearCalendarView ? (
              <div className="ml-4 mr-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-white"><CalendarYearView yearDate={currentDate} selectedDate={selectedDate} visibleEvents={mainCalendarEvents} eventDisplayResolver={yearEventDisplayResolver} onSelectDate={handleMonthCellSelectDate} onRenderedRangeChange={handleYearRenderedRangeChange} onSyncRangeChange={handleYearSyncRangeChange} /></div>
            ) : isSplitCalendarView ? (
              <CalendarSelectedViewsSplitView selectedViewModes={selectedViewModes} currentDate={currentDate} selectedDate={selectedDate} visibleDays={visibleDays} virtualRail={virtualRail} events={mainCalendarEvents} appProjects={appProjects} googleAccounts={googleAccountsWithColorOverrides} headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} calendarGridStyle={calendarGridStyle} allDayEventOrder={allDayEventOrder} onCalendarScroll={handleCalendarScroll} onSelectDate={handleSidebarSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onVisibleDateChange={handleVisibleDateChange} onMoveCalendarEvent={handleMoveCalendarEvent} onReorderAllDayEvents={handleReorderAllDayEvents} />
            ) : isPieChartCalendarView ? (
              <div className="ml-4 mr-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-white"><CalendarPieChartView days={visibleDays} virtualRail={virtualRail} selectedDate={selectedDate} events={mainCalendarEvents} appProjects={appProjects} googleAccounts={googleAccountsWithColorOverrides} onSelectDate={handleSidebarSelectDate} onVisibleDateChange={handleVisibleDateChange} /></div>
            ) : isListCalendarView ? (
              <div className="ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-white"><CalendarListView days={visibleDays} virtualRail={virtualRail} events={mainCalendarEvents} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} onVisibleMonthChange={handleVisibleMonthChange} /></div>
            ) : isMonthCalendarView ? (
              <div className={cn("ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-r-0", IOS_CALENDAR_MONTH_SURFACE_CLASS)}><CalendarMonthView currentDate={currentDate} selectedDate={selectedDate} scrollTargetToken={monthScrollTargetToken} visibleEvents={mainCalendarEvents} monthVisibleEventCount={monthVisibleEventCount} onSelectDate={handleMonthCellSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onRenderedRangeChange={handleMonthRenderedRangeChange} onMoveCalendarEvent={handleMoveCalendarEvent} /></div>
            ) : isTimetableCalendarView ? (
              <div className="ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-white"><CalendarTimetableView weekDate={currentDate} /></div>
            ) : (
              <div className={cn("ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden border-0", IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={mainCalendarEvents} calendarGridStyle={calendarGridStyle} allDayEventOrder={allDayEventOrder} onScroll={handleCalendarScroll} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} onMoveCalendarEvent={handleMoveCalendarEvent} onReorderAllDayEvents={handleReorderAllDayEvents} /></div>
            )}
          </div>
          {isCalendarPrintPanelActive && isCalendarPrintRangeMode && <CalendarPrintRangeView titleLabel={headerTitleLabel} rangeLabel={printRangeLabel} focusDate={currentDate} range={printDisplayRange} events={printCalendarEvents} />}
        </div>
      </CarvePanel>
    </CarvePanelShell>
  );
};

export { ScheduleScreen };
