import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfDay, format, startOfDay, subDays } from "date-fns";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { attachCalendarEventDisplayMetadata, filterCalendarEventsBySourceVisibility } from "@/features/calendar/calendarEventVisibility";
import { createCalendarYearEventDisplayResolver } from "@/features/calendar/calendarEventSourcePriority";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarYearView } from "@/features/calendar/grid/CalendarView.year";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import { CalendarListView } from "@/features/calendar/list/CalendarListView.desktop";
import { persistProjectCalendarLinks, readStoredProjectCalendarLinks } from "@/features/calendar/projectCalendarLinks.storage";
import type { AppCalendarItem, CalendarViewMode, CalendarViewModeSelection, GoogleAccountDisplay, GoogleCalendarColorOverrideMap, ProjectCalendarLink, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { CalendarTimetableView } from "@/features/calendar/timetable/CalendarTimetableView";
import { applyCalendarEventMoveOverrides, useCalendarEventMoveController } from "@/features/calendar/useCalendarEventMoveController";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { createCalendarEventsScopeKey, useTransientEmptyCalendarEvents } from "@/features/calendar/useTransientEmptyCalendarEvents";
import { clearLegacyStoredAppProjects, normalizeRootFolderProjectLabel, readLegacyStoredAppProjects, useRootFolderProjects } from "@/features/calendar/useRootFolderProjects";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { CalendarPieChartView } from "@/pane.desktop/leftpane/schedule/Calendar.PieChartView";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@shared/i18n/useT";
import { MobileCalendarEventComposer } from "./MobileCalendarEventComposer";

type CalendarEventDisplayRange = { start: Date; end: Date };
type CalendarEventDisplayRangeOptions = { primaryViewMode: CalendarViewMode; currentDate: Date; selectedDate: Date; visibleDays: Date[]; monthRenderedRange: CalendarDateRange | null; yearRenderedRange: CalendarDateRange | null };
type MobileCalendarViewModeOption = { value: CalendarViewMode; label: string };
type MobileViewModeDropdownProps = { value: CalendarViewModeSelection; onChange: (value: CalendarViewMode) => void; options: readonly MobileCalendarViewModeOption[] };

const IOS_CALENDAR_MONTH_SURFACE_CLASS = "border-transparent bg-[rgba(255,255,255,0.94)] shadow-none";
const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const GOOGLE_CALENDAR_COLOR_OVERRIDES_STORAGE_KEY = "flashcard-master:schedule:google-calendar-color-overrides";
const MOBILE_SCHEDULE_STYLE = "@media (max-width: 767px) { .schedule-mobile-month-surface .calendar-month-row-boundary-resize-handle { display: none !important; } .schedule-mobile-calendar-surface .calendar-month-scroll, .schedule-mobile-calendar-surface .calendar-timeline-scroll, .schedule-mobile-calendar-surface .calendar-year-view, .schedule-mobile-calendar-surface .scrollbar-hidden { -ms-overflow-style: none; scrollbar-gutter: auto; scrollbar-width: none; } .schedule-mobile-calendar-surface .calendar-month-scroll::-webkit-scrollbar, .schedule-mobile-calendar-surface .calendar-timeline-scroll::-webkit-scrollbar, .schedule-mobile-calendar-surface .calendar-year-view::-webkit-scrollbar, .schedule-mobile-calendar-surface .scrollbar-hidden::-webkit-scrollbar { display: none; width: 0; height: 0; } }";
const MOBILE_SCHEDULE_PANEL_CLASS = "!m-0 h-full min-h-0 !rounded-none !border-0 !shadow-none";
const MOBILE_SCHEDULE_HEADER_CLASS = "flex shrink-0 flex-col px-4 pb-3 pl-14 pt-4";
const MOBILE_SCHEDULE_SURFACE_CLASS = "schedule-mobile-calendar-surface mx-0 flex min-h-0 flex-1 flex-col overflow-hidden !rounded-none !border-0";
const MOBILE_TODAY_BUTTON_CLASS = "flex h-8 shrink-0 items-center justify-center rounded-full bg-[#f7f7f7] px-3 text-[13px] font-semibold tracking-[-0.02em] text-[#8e8e93] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition hover:bg-[#efeff4] hover:text-[#6e6e73] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1d1d6]";
const MOBILE_ADD_EVENT_BUTTON_CLASS = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#efeeee] text-[22px] font-light leading-none text-[#6b6b6b] shadow-[0_1px_6px_rgba(47,52,59,0.08)] ring-1 ring-[rgba(47,52,59,0.08)] transition hover:bg-[#e8e6e2] hover:text-[#2f343b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7d3ce]";
const LIST_AND_PIE_CHART_EVENT_BUFFER_DAYS = 45;
const WEEKDAY_EVENT_BUFFER_DAYS = 1;
const MONTH_EVENT_BUFFER_DAYS = 14;
const EMPTY_APP_PROJECTS: AppCalendarItem[] = [];

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
        <div role="menu" aria-label="表示形式" className="absolute right-0 top-[calc(100%+8px)] z-50 w-40 overflow-hidden rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white py-1 shadow-[0_6px_20px_rgba(0,0,0,0.14),0_1px_6px_rgba(0,0,0,0.08)]">
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
  const pane = useScheduleScreen({ allowMultiSelectViewMode: false });
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const didMigrateLegacyProjectsRef = useRef(false);
  const { appProjects, loading: rootFolderProjectsLoading, createRootFolderProject, findProjectByLabel, setProjectVisibility } = useRootFolderProjects();
  const [isEventComposerOpen, setIsEventComposerOpen] = useState(false);
  const [projectCalendarLinks, setProjectCalendarLinks] = useState<ProjectCalendarLink[]>(readStoredProjectCalendarLinks);
  const [googleCalendarColorOverrides] = useState<GoogleCalendarColorOverrideMap>(readStoredGoogleCalendarColorOverrides);
  const { selectedViewMode, primaryViewMode, currentDate, selectedDate, titleDate, monthTitleDate, monthScrollTargetToken, visibleDays, virtualRail, yearRenderedRange, googleCalendarEvents, googleAccounts, calendarGridStyle, headerScrollRef, allDayScrollRef, scrollContainerRef, contentViewportRef, handleCalendarScroll, handleSelectViewMode, handleSidebarSelectDate, handleVisibleDateChange, handleVisibleMonthChange, handlePrevious, handleNext, handleToday, handleMonthCellSelectDate, handleMonthRenderedRangeChange, handleYearRenderedRangeChange, handleYearSyncRangeChange, addGoogleCalendar, createGoogleCalendarEvent, updateGoogleCalendarEvent } = pane;
  const { calendarEventMoveOverrides, handleMoveCalendarEvent } = useCalendarEventMoveController({ updateGoogleCalendarEvent });
  const viewOptions = useMemo(() => [{ value: "year", label: t.viewYear }, { value: "month", label: t.viewMonth }, { value: "week", label: t.viewWeek }, { value: "threeDays", label: t.viewThreeDays }, { value: "days", label: t.viewDay }, { value: "list", label: t.viewList }, { value: "timetable", label: t.viewTimetable }, { value: "pieChart", label: t.viewPieChart }] as const, [t.viewDay, t.viewList, t.viewMonth, t.viewPieChart, t.viewThreeDays, t.viewTimetable, t.viewWeek, t.viewYear]);

  useEffect(() => { persistProjectCalendarLinks(projectCalendarLinks); }, [projectCalendarLinks]);
  useEffect(() => { persistGoogleCalendarColorOverrides(googleCalendarColorOverrides); }, [googleCalendarColorOverrides]);
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

  const handleOpenEventComposer = useCallback(() => {
    setIsEventComposerOpen(true);
  }, []);

  const handleCloseEventComposer = useCallback(() => {
    setIsEventComposerOpen(false);
  }, []);

  const googleAccountsWithColorOverrides = useMemo(() => applyGoogleCalendarColorOverridesToAccounts(googleAccounts, googleCalendarColorOverrides), [googleAccounts, googleCalendarColorOverrides]);
  const yearEventDisplayResolver = useMemo(() => createCalendarYearEventDisplayResolver({ appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverrides }), [appProjects, googleAccountsWithColorOverrides, projectCalendarLinks]);
  const linkedGoogleCalendarEvents = useMemo(() => attachCalendarEventDisplayMetadata(googleCalendarEvents, { appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverrides, googleCalendarColorOverrides }), [appProjects, googleAccountsWithColorOverrides, googleCalendarColorOverrides, googleCalendarEvents, projectCalendarLinks]);
  const overriddenGoogleCalendarEvents = useMemo(() => applyCalendarEventMoveOverrides(linkedGoogleCalendarEvents, calendarEventMoveOverrides), [calendarEventMoveOverrides, linkedGoogleCalendarEvents]);
  const visibleGoogleCalendarEvents = useMemo(() => filterCalendarEventsBySourceVisibility(overriddenGoogleCalendarEvents, { appProjects, projectCalendarLinks, googleAccounts: googleAccountsWithColorOverrides }), [appProjects, googleAccountsWithColorOverrides, overriddenGoogleCalendarEvents, projectCalendarLinks]);
  const mainDisplayRange = useMemo(() => getScheduleEventDisplayRange({ primaryViewMode, currentDate, selectedDate, visibleDays, monthRenderedRange: pane.monthRenderedRange, yearRenderedRange }), [currentDate, pane.monthRenderedRange, primaryViewMode, selectedDate, visibleDays, yearRenderedRange]);
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
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]" onClick={handlePrevious} aria-label={t.previousLabel}>‹</button>
          <h1 className="truncate text-[19px] font-bold tracking-[-0.03em] text-[#1c1c1e]">{format(headerTitleDate, headerTitleFormat, { locale: dateFnsLocale })}</h1>
          <button type="button" className={MOBILE_TODAY_BUTTON_CLASS} onClick={handleToday} aria-label={t.todayButton}>{t.todayButton}</button>
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]" onClick={handleNext} aria-label={t.nextLabel}>›</button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className={MOBILE_ADD_EVENT_BUTTON_CLASS} onClick={handleOpenEventComposer} aria-label="新規予定を追加">＋</button>
          <MobileViewModeDropdown value={selectedViewMode} onChange={handleSelectViewMode} options={viewOptions} />
        </div>
      </div>
    </div>
  );

  const renderCalendarContent = () => {
    if (isYearCalendarView) {
      return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarYearView yearDate={currentDate} selectedDate={selectedDate} visibleEvents={mainCalendarEvents} eventDisplayResolver={yearEventDisplayResolver} onSelectDate={handleMonthCellSelectDate} onRenderedRangeChange={handleYearRenderedRangeChange} onSyncRangeChange={handleYearSyncRangeChange} /></div></CarvePanel>;
    }

    if (isListCalendarView) {
      return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarListView days={visibleDays} virtualRail={virtualRail} events={mainCalendarEvents} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} onVisibleMonthChange={handleVisibleMonthChange} /></div></CarvePanel>;
    }

    if (isTimetableCalendarView) {
      return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarTimetableView weekDate={currentDate} density="compact" /></div></CarvePanel>;
    }

    if (isPieChartCalendarView) {
      return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarPieChartView days={visibleDays} selectedDate={selectedDate} events={mainCalendarEvents} appProjects={EMPTY_APP_PROJECTS} googleAccounts={googleAccountsWithColorOverrides} onSelectDate={handleSidebarSelectDate} onVisibleDateChange={handleVisibleDateChange} /></div></CarvePanel>;
    }

    if (isMonthCalendarView) {
      return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn("schedule-mobile-month-surface", MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_MONTH_SURFACE_CLASS)}><CalendarMonthView currentDate={currentDate} selectedDate={selectedDate} scrollTargetToken={monthScrollTargetToken} visibleEvents={mainCalendarEvents} showEventTimeLabel={false} onSelectDate={handleSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onRenderedRangeChange={handleMonthRenderedRangeChange} onMoveCalendarEvent={handleMoveCalendarEvent} /></div></CarvePanel>;
    }

    return <CarvePanel className={MOBILE_SCHEDULE_PANEL_CLASS}>{renderViewHeader(MOBILE_SCHEDULE_HEADER_CLASS)}<div className={cn(MOBILE_SCHEDULE_SURFACE_CLASS, IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}><CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={mainCalendarEvents} calendarGridStyle={calendarGridStyle} onScroll={handleCalendarScroll} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} /></div></CarvePanel>;
  };

  return <div ref={contentViewportRef} className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-[#1c1c1e]"><style>{MOBILE_SCHEDULE_STYLE}</style><MobileCalendarEventComposer isOpen={isEventComposerOpen} selectedDate={selectedDate} accounts={googleAccountsWithColorOverrides} projectCalendarLinks={projectCalendarLinks} onClose={handleCloseEventComposer} onAddCalendar={addGoogleCalendar} onCreateEvent={createGoogleCalendarEvent} /><main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white p-0">{renderCalendarContent()}</main></div>;
};

export { ScheduleScreen };
