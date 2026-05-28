import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { PlanResultMode } from "@/chip/toggle/Toggle.planresult";
import { CarvePanel, CarvePanelShell } from "@/components/panel/CarvePanel.desktop";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarYearView } from "@/features/calendar/grid/CalendarView.year";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import { CalendarListView } from "@/features/calendar/list/CalendarListView.desktop";
import { createProjectCalendarLink, persistProjectCalendarLinks, readStoredProjectCalendarLinks } from "@/features/calendar/projectCalendarLinks.storage";
import type { AppCalendarItem, ProjectCalendarLink, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { ScheduleScreenHeaderDesktop } from "@/features/header/ScheduleScreenHeader.desktop";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";
import { CalendarSidebar } from "@/pane.desktop/leftpane/CalendarSidebar";
import { CalendarListPieChartSplitView } from "@/pane.desktop/leftpane/schedule/Calendar.ListPieChartSplitView.desktop";
import { CalendarPieChartView } from "@/pane.desktop/leftpane/schedule/Calendar.PieChartView";
import { CalendarWorkspaceToolbar } from "@/pane.desktop/header/ScheduleToolbar";

type StoredAppCalendarItem = Partial<AppCalendarItem>;

const IOS_CALENDAR_MONTH_SURFACE_CLASS =
  "border-transparent bg-[rgba(255,255,255,0.92)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";

const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS =
  "border-transparent bg-white shadow-none";

const APP_PROJECTS_STORAGE_KEY = "flashcard-master:schedule:app-projects";
const DEFAULT_PLAN_RESULT_MODES: readonly PlanResultMode[] = ["plan", "actual"];
const PLAN_RESULT_TOGGLE_VIEW_MODES = new Set(["threeDays", "days", "pieChart"]);
const APP_PROJECT_COLORS = [
  "#34c759",
  "#ff3b30",
  "#4f8ce7",
  "#ffd166",
  "#9adfe7",
  "#66a77a",
  "#9ca3ff",
];

const createAppProjectId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `app-project:${crypto.randomUUID()}`;
  }

  return `app-project:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2)}`;
};

const readStoredAppProjects = (): AppCalendarItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(APP_PROJECTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item, index): AppCalendarItem[] => {
      const project = item as StoredAppCalendarItem;
      const label = typeof project.label === "string" ? project.label.trim() : "";
      if (!label) return [];

      return [
        {
          id: typeof project.id === "string" ? project.id : createAppProjectId(),
          label,
          color:
            typeof project.color === "string"
              ? project.color
              : APP_PROJECT_COLORS[index % APP_PROJECT_COLORS.length],
          checked: typeof project.checked === "boolean" ? project.checked : true,
        },
      ];
    });
  } catch {
    return [];
  }
};

const persistAppProjects = (projects: AppCalendarItem[]) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(APP_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // localStorage が利用できない環境でも、画面上の追加表示は維持する。
  }
};

const normalizeProjectLabel = (label: string): string => label.trim().toLowerCase();

const createAppProjectFromName = (projectName: string, colorIndex: number): AppCalendarItem => ({
  id: createAppProjectId(),
  label: projectName.trim(),
  color: APP_PROJECT_COLORS[colorIndex % APP_PROJECT_COLORS.length],
  checked: true,
});

const findProjectByLabel = (projects: AppCalendarItem[], label: string): AppCalendarItem | null => {
  const normalizedLabel = normalizeProjectLabel(label);
  return projects.find((project) => normalizeProjectLabel(project.label) === normalizedLabel) ?? null;
};

const resolveProjectForExternalCalendarLabel = (
  projects: AppCalendarItem[],
  label: string,
): { project: AppCalendarItem; shouldCreate: boolean } => {
  const existingProject = findProjectByLabel(projects, label);

  if (existingProject) {
    return { project: { ...existingProject, checked: true }, shouldCreate: false };
  }

  return {
    project: createAppProjectFromName(label, projects.length),
    shouldCreate: true,
  };
};

const resolveGoogleEventProjectId = (
  event: GoogleCalendarEvent,
  links: ProjectCalendarLink[],
): string | undefined => {
  const exactLink = links.find(
    (link) =>
      link.provider === "google" &&
      link.externalCalendarId === event.calendarId &&
      (!event.accountId || link.accountId === event.accountId),
  );

  return exactLink?.projectId ?? event.projectId;
};

const attachProjectIdsToGoogleEvents = (
  events: GoogleCalendarEvent[],
  links: ProjectCalendarLink[],
): GoogleCalendarEvent[] => events.map((event) => {
  const projectId = resolveGoogleEventProjectId(event, links);

  return projectId
    ? { ...event, projectId }
    : event;
});

const filterEventsByProjectVisibility = (
  events: GoogleCalendarEvent[],
  projects: AppCalendarItem[],
): GoogleCalendarEvent[] => {
  const checkedByProjectId = new Map(projects.map((project) => [project.id, project.checked]));

  return events.filter((event) => {
    if (!event.projectId) return true;

    const checked = checkedByProjectId.get(event.projectId);
    return checked !== false;
  });
};

const ScheduleScreen = ({
  onClose: _onClose,
}: ScheduleScreenProps) => {
  const pane = useScheduleScreen();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const [appProjects, setAppProjects] = useState<AppCalendarItem[]>(readStoredAppProjects);
  const [projectCalendarLinks, setProjectCalendarLinks] = useState<ProjectCalendarLink[]>(readStoredProjectCalendarLinks);
  const [planResultModes, setPlanResultModes] = useState<PlanResultMode[]>([
    ...DEFAULT_PLAN_RESULT_MODES,
  ]);

  const viewOptions = useMemo(
    () => [
      { value: "year", label: t.viewYear },
      { value: "month", label: t.viewMonth },
      { value: "week", label: t.viewWeek },
      { value: "threeDays", label: t.viewThreeDays },
      { value: "days", label: t.viewDay },
      { value: "list", label: t.viewList },
      { value: "pieChart", label: t.viewPieChart },
    ] as const,
    [t.viewDay, t.viewList, t.viewMonth, t.viewPieChart, t.viewThreeDays, t.viewWeek, t.viewYear],
  );

  const {
    selectedViewMode,
    primaryViewMode,
    currentDate,
    selectedDate,
    titleDate,
    monthTitleDate,
    monthScrollTargetToken,
    visibleDays,
    googleCalendarEvents,
    googleAccounts,
    isAnyCalendarConnecting,
    calendarDayColumnWidth,
    calendarGridStyle,
    headerScrollRef,
    allDayScrollRef,
    scrollContainerRef,
    contentViewportRef,
    handleCalendarScroll,
    handleSelectViewMode,
    handleSidebarSelectDate,
    handleSidebarPreviousMonth,
    handleSidebarNextMonth,
    handleVisibleDateChange,
    handleVisibleMonthChange,
    handlePrevious,
    handleNext,
    handleToday,
    handleMonthCellSelectDate,
    handleMonthRenderedRangeChange,
    handleYearRenderedRangeChange,
    handleListReachStart,
    handleListReachEnd,
    addGoogleCalendar,
    reconnectGoogleAccount,
    toggleGoogleCalendar,
  } = pane;

  useEffect(() => {
    persistAppProjects(appProjects);
  }, [appProjects]);

  useEffect(() => {
    persistProjectCalendarLinks(projectCalendarLinks);
  }, [projectCalendarLinks]);

  const handleAddAppProject = useCallback((projectName: string) => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) return;

    setAppProjects((projects) => {
      const duplicateProject = findProjectByLabel(projects, trimmedProjectName);

      if (duplicateProject) {
        return projects.map((project) =>
          project.id === duplicateProject.id ? { ...project, checked: true } : project,
        );
      }

      return [
        ...projects,
        createAppProjectFromName(trimmedProjectName, projects.length),
      ];
    });
  }, []);

  const handleToggleAppProject = useCallback((projectId: string) => {
    setAppProjects((projects) =>
      projects.map((project) =>
        project.id === projectId ? { ...project, checked: !project.checked } : project,
      ),
    );
  }, []);

  const handleLinkGoogleCalendarAsProject = useCallback((accountId: string, calendarId: string) => {
    const account = googleAccounts.find((item) => item.accountId === accountId);
    const calendar = account?.calendars.find((item) => item.id === calendarId);
    if (!account || !calendar) return;

    const calendarLabel = calendar.summaryOverride ?? calendar.summary;
    const resolved = resolveProjectForExternalCalendarLabel(appProjects, calendarLabel);

    setAppProjects((projects) => {
      if (projects.some((project) => project.id === resolved.project.id)) {
        return projects.map((project) =>
          project.id === resolved.project.id ? { ...project, checked: true } : project,
        );
      }

      const latestDuplicate = findProjectByLabel(projects, resolved.project.label);

      if (latestDuplicate) {
        return projects.map((project) =>
          project.id === latestDuplicate.id ? { ...project, checked: true } : project,
        );
      }

      return [...projects, resolved.project];
    });

    const link = createProjectCalendarLink({
      projectId: resolved.project.id,
      provider: "google",
      accountId,
      externalCalendarId: calendar.id,
      externalCalendarName: calendarLabel,
      syncDirection: "importOnly",
      createdByApp: false,
      color: calendar.backgroundColor,
      lastSyncedAt: new Date().toISOString(),
    });

    setProjectCalendarLinks((links) => {
      if (links.some((item) => item.id === link.id)) {
        return links.map((item) => item.id === link.id ? { ...item, ...link } : item);
      }

      return [...links, link];
    });

    if (!account.selectedCalendarIds.has(calendar.id)) {
      toggleGoogleCalendar(accountId, calendar.id);
    }
  }, [appProjects, googleAccounts, toggleGoogleCalendar]);

  const handleUnlinkProjectCalendar = useCallback((linkId: string) => {
    setProjectCalendarLinks((links) => links.filter((link) => link.id !== linkId));
  }, []);

  const linkedGoogleCalendarEvents = useMemo(
    () => attachProjectIdsToGoogleEvents(googleCalendarEvents, projectCalendarLinks),
    [googleCalendarEvents, projectCalendarLinks],
  );
  const visibleGoogleCalendarEvents = useMemo(
    () => filterEventsByProjectVisibility(linkedGoogleCalendarEvents, appProjects),
    [appProjects, linkedGoogleCalendarEvents],
  );
  const deferredCalendarEvents = useDeferredValue(visibleGoogleCalendarEvents);
  const selectedViewModes = useMemo(
    () => Array.isArray(selectedViewMode) ? selectedViewMode : [selectedViewMode],
    [selectedViewMode],
  );

  const isListCalendarView = selectedViewModes.includes("list");
  const isPieChartCalendarView = selectedViewModes.includes("pieChart");
  const isListPieChartSplitView = isListCalendarView && isPieChartCalendarView;
  const sidebarMonthDate =
    primaryViewMode === "month" || isListCalendarView ? monthTitleDate : titleDate;
  const isYearCalendarView = primaryViewMode === "year";
  const isMonthCalendarView = primaryViewMode === "month";
  const canShowPlanResultToggle = selectedViewModes.some((mode) =>
    PLAN_RESULT_TOGGLE_VIEW_MODES.has(mode),
  );
  const headerTitleDate =
    isListPieChartSplitView
      ? selectedDate
      : primaryViewMode === "month" || isListCalendarView
        ? monthTitleDate
        : isPieChartCalendarView
          ? selectedDate
          : titleDate;
  const headerTitleLabel = primaryViewMode === "year"
    ? format(headerTitleDate, "yyyy年", { locale: dateFnsLocale })
    : format(headerTitleDate, isPieChartCalendarView ? "yyyy年M月d日" : monthLabelFormat, { locale: dateFnsLocale });

  return (
    <CarvePanelShell
      toolbar={(
        <CalendarWorkspaceToolbar
          viewMode={selectedViewMode}
          onSelectViewMode={handleSelectViewMode}
        />
      )}
      leftPanel={(
        <CalendarSidebar
          monthDate={sidebarMonthDate}
          selectedDate={selectedDate}
          selectedRange={null}
          visibleEvents={deferredCalendarEvents}
          appProjects={appProjects}
          projectCalendarLinks={projectCalendarLinks}
          googleAccounts={googleAccounts}
          isAnyCalendarConnecting={isAnyCalendarConnecting}
          onSelectDate={handleSidebarSelectDate}
          onPreviousMonth={handleSidebarPreviousMonth}
          onNextMonth={handleSidebarNextMonth}
          onAddCalendar={addGoogleCalendar}
          onAddProject={handleAddAppProject}
          onToggleProject={handleToggleAppProject}
          onLinkGoogleCalendarAsProject={handleLinkGoogleCalendarAsProject}
          onUnlinkProjectCalendar={handleUnlinkProjectCalendar}
          onReconnectAccount={(accountId) => {
            void reconnectGoogleAccount(accountId);
          }}
          onToggleCalendar={toggleGoogleCalendar}
        />
      )}
      viewportRef={contentViewportRef}
    >
      <CarvePanel>
        <ScheduleScreenHeaderDesktop
          titleLabel={headerTitleLabel}
          selectedViewMode={selectedViewMode}
          viewOptions={viewOptions}
          planResultModes={planResultModes}
          showPlanResultToggle={canShowPlanResultToggle}
          onSelectViewMode={handleSelectViewMode}
          onChangePlanResultModes={setPlanResultModes}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
          className="mb-2 flex shrink-0 items-center justify-between px-5 pt-4"
        />

        {isYearCalendarView ? (
          <div className="ml-4 mr-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <CalendarYearView
              yearDate={currentDate}
              selectedDate={selectedDate}
              visibleEvents={deferredCalendarEvents}
              onSelectDate={handleMonthCellSelectDate}
              onRenderedRangeChange={handleYearRenderedRangeChange}
            />
          </div>
        ) : isListPieChartSplitView ? (
          <CalendarListPieChartSplitView
            days={visibleDays}
            events={deferredCalendarEvents}
            selectedDate={selectedDate}
            appProjects={appProjects}
            googleAccounts={googleAccounts}
            onSelectDate={handleSidebarSelectDate}
            onReachStart={handleListReachStart}
            onReachEnd={handleListReachEnd}
            onVisibleMonthChange={handleVisibleMonthChange}
            onVisibleDateChange={handleVisibleDateChange}
          />
        ) : isPieChartCalendarView ? (
          <div className="ml-4 mr-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <CalendarPieChartView
              days={visibleDays}
              selectedDate={selectedDate}
              events={deferredCalendarEvents}
              appProjects={appProjects}
              googleAccounts={googleAccounts}
              onSelectDate={handleSidebarSelectDate}
              onReachStart={handleListReachStart}
              onReachEnd={handleListReachEnd}
              onVisibleDateChange={handleVisibleDateChange}
            />
          </div>
        ) : isListCalendarView ? (
          <div className="ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-[22px] rounded-tr-none border-0 bg-white">
            <CalendarListView
              days={visibleDays}
              events={deferredCalendarEvents}
              selectedDate={selectedDate}
              onSelectDate={handleSidebarSelectDate}
              onReachStart={handleListReachStart}
              onReachEnd={handleListReachEnd}
              onVisibleMonthChange={handleVisibleMonthChange}
            />
          </div>
        ) : isMonthCalendarView ? (
          <div
            className={cn(
              "ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-[22px] rounded-tr-none border border-b-0 border-r-0",
              IOS_CALENDAR_MONTH_SURFACE_CLASS,
            )}
          >
            <CalendarMonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              scrollTargetToken={monthScrollTargetToken}
              visibleEvents={deferredCalendarEvents}
              onSelectDate={handleMonthCellSelectDate}
              onVisibleMonthChange={handleVisibleMonthChange}
              onRenderedRangeChange={handleMonthRenderedRangeChange}
            />
          </div>
        ) : (
          <div
            className={cn(
              "ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-[22px] rounded-tr-none border-0",
              IOS_CALENDAR_WEEKDAY_SURFACE_CLASS,
            )}
          >
            <CalendarWeekDayGrid
              headerScrollRef={headerScrollRef}
              allDayScrollRef={allDayScrollRef}
              scrollContainerRef={scrollContainerRef}
              visibleDays={visibleDays}
              visibleEvents={deferredCalendarEvents}
              calendarDayColumnWidth={calendarDayColumnWidth}
              _calendarDayColumnWidth={calendarDayColumnWidth}
              calendarGridStyle={calendarGridStyle}
              onScroll={handleCalendarScroll}
              selectedDate={selectedDate}
              onSelectDate={handleSidebarSelectDate}
            />
          </div>
        )}
      </CarvePanel>
    </CarvePanelShell>
  );
};

export { ScheduleScreen };
