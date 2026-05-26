import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { SidebarOpenIcon } from "@/chip/icons/icons.sidebar";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/dropdownchip/ViewModeDropdownChip";
import type { AppCalendarItem, ScheduleScreenProps } from "./scheduleScreen.types";
import { CalendarMonthView } from "./grid/CalendarView.month";
import { CalendarWeekDayGrid } from "./grid/Grid.calendar.weekday.desktop";
import { TaskView } from "./task/TaskView";
import { CalendarTimelineDayView, type TimelineLane } from "./grid/TimelineDayView";
import { useScheduleScreen } from "./useScheduleScreen";
import { DayDetailPanel } from "./panel/DayDetailPanel";
import { CalendarSidebar } from "./panel/CalendarSidebar";
import { CalendarWorkspaceToolbar } from "../../pane/sidebar/ScheduleToolbar";
import { useTaskCalendarEvents } from "./task/hooks/useTaskCalendarEvents";
import { CarvePanel, CarvePanelShell } from "../../components/panel/CarvePanel.desktop";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

const IOS_CALENDAR_SURFACE_CLASS =
  "border-transparent bg-white shadow-none";

const IOS_CALENDAR_MONTH_SURFACE_CLASS =
  "border-transparent bg-[rgba(255,255,255,0.92)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";

const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS =
  "border-transparent bg-white shadow-none";

const DAY_DETAIL_PANEL_TOGGLE_BUTTON_CLASS =
  "absolute right-4 top-2 z-50 flex h-7 w-8 min-w-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-[#8c8c8c] shadow-none appearance-none select-none outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:text-[#8c8c8c] focus:outline-none focus:ring-0 focus-visible:outline-none motion-reduce:transition-none";

const DAY_DETAIL_PANEL_WIDTH_PX = 269;
const DAY_DETAIL_PANEL_MIN_CALENDAR_WIDTH_PX = 720;
const DAY_DETAIL_PANEL_AUTO_OPEN_MIN_BODY_WIDTH_PX =
  DAY_DETAIL_PANEL_WIDTH_PX + DAY_DETAIL_PANEL_MIN_CALENDAR_WIDTH_PX;
const VIEW_HEADER_CONTROLS_RIGHT_INSET_PX = 56;
const APP_PROJECTS_STORAGE_KEY = "flashcard-master:schedule:app-projects";
const DEFAULT_TIMELINE_CALENDAR_COLOR = "#74798b";
const APP_PROJECT_COLORS = [
  "#34c759",
  "#ff3b30",
  "#4f8ce7",
  "#ffd166",
  "#9adfe7",
  "#66a77a",
  "#9ca3ff",
];

type StoredAppCalendarItem = Partial<AppCalendarItem>;

const getInitialCanFitDayDetailPanel = (): boolean => {
  if (typeof window === "undefined") return true;

  return window.innerWidth >= DAY_DETAIL_PANEL_AUTO_OPEN_MIN_BODY_WIDTH_PX;
};

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

  window.localStorage.setItem(APP_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

const toggleIdInSet = (source: Set<string>, id: string): Set<string> => {
  const next = new Set(source);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
};

const equalSet = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false;

  for (const value of a) {
    if (!b.has(value)) return false;
  }

  return true;
};

export const ScheduleScreen = ({
  initialActiveMode,
  onClose: _onClose,
}: ScheduleScreenProps) => {
  const pane = useScheduleScreen({ initialActiveMode });
  const taskCalendarEvents = useTaskCalendarEvents();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const [availableCalendarBodyWidth, setAvailableCalendarBodyWidth] = useState(0);
  const [canFitDayDetailPanel, setCanFitDayDetailPanel] = useState(
    getInitialCanFitDayDetailPanel,
  );
  const [isDayDetailPanelOpen, setIsDayDetailPanelOpen] = useState(
    getInitialCanFitDayDetailPanel,
  );
  const [appProjects, setAppProjects] = useState<AppCalendarItem[]>(
    readStoredAppProjects,
  );
  const [selectedTaskListIds, setSelectedTaskListIds] = useState<Set<string>>(
    () => new Set(),
  );
  const selectedTaskListInitializedRef = useRef(false);

  const viewOptions = useMemo(
    () => [
      { value: "month", label: t.viewMonth },
      { value: "week", label: t.viewWeek },
      { value: "days", label: t.viewDay },
    ] as const,
    [t.viewDay, t.viewMonth, t.viewWeek],
  );

  const {
    activeMode,
    selectedViewMode,
    currentDate,
    selectedDate,
    titleDate,
    monthTitleDate,
    monthScrollTargetToken,
    timelineUnitBuffer,
    visibleDays,
    googleCalendarEvents,
    googleAccounts,
    isAnyCalendarConnecting,
    calendarDayColumnWidth,
    timelineGridStyle,
    headerScrollRef,
    allDayScrollRef,
    scrollContainerRef,
    contentViewportRef,
    handleCalendarScroll,
    setActiveMode,
    handleSelectViewMode,
    handleSidebarSelectDate,
    handleTimelineSelectDate,
    handleSidebarPreviousMonth,
    handleSidebarNextMonth,
    handleVisibleMonthChange,
    handlePrevious,
    handleNext,
    handleToday,
    handleMonthCellSelectDate,
    handleMonthRenderedRangeChange,
    addGoogleCalendar,
    reconnectGoogleAccount,
    toggleGoogleCalendar,
    refreshGoogleTasks,
    createGoogleTask,
    updateGoogleTask,
    moveGoogleTaskList,
    deleteGoogleTask,
  } = pane;

  useEffect(() => {
    const viewportEl = contentViewportRef.current;
    const bodyEl = viewportEl?.parentElement ?? null;
    if (!viewportEl || !bodyEl) return;

    const getLeftPanelWidth = () => {
      const leftPanelEl = viewportEl.previousElementSibling;

      return leftPanelEl instanceof HTMLElement
        ? leftPanelEl.getBoundingClientRect().width
        : 0;
    };

    const updateAvailableCalendarBodyWidth = () => {
      const bodyWidth = bodyEl.getBoundingClientRect().width;
      const leftPanelWidth = getLeftPanelWidth();

      setAvailableCalendarBodyWidth(
        Math.max(0, bodyWidth - leftPanelWidth),
      );
    };

    const resizeObserver = new ResizeObserver(updateAvailableCalendarBodyWidth);
    const leftPanelEl = viewportEl.previousElementSibling;

    resizeObserver.observe(bodyEl);
    if (leftPanelEl instanceof Element) {
      resizeObserver.observe(leftPanelEl);
    }

    updateAvailableCalendarBodyWidth();
    window.addEventListener("resize", updateAvailableCalendarBodyWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateAvailableCalendarBodyWidth);
    };
  }, [contentViewportRef]);

  useEffect(() => {
    persistAppProjects(appProjects);
  }, [appProjects]);

  const handleAddAppProject = useCallback((projectName: string) => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) return;

    setAppProjects((projects) => {
      const duplicateProject = projects.find(
        (project) => project.label.trim().toLowerCase() === trimmedProjectName.toLowerCase(),
      );

      if (duplicateProject) {
        return projects.map((project) =>
          project.id === duplicateProject.id
            ? { ...project, checked: true }
            : project,
        );
      }

      return [
        ...projects,
        {
          id: createAppProjectId(),
          label: trimmedProjectName,
          color: APP_PROJECT_COLORS[projects.length % APP_PROJECT_COLORS.length],
          checked: true,
        },
      ];
    });
  }, []);

  const handleToggleAppProject = useCallback((projectId: string) => {
    setAppProjects((projects) =>
      projects.map((project) =>
        project.id === projectId
          ? { ...project, checked: !project.checked }
          : project,
      ),
    );
  }, []);

  const allTaskListIds = useMemo(
    () => googleAccounts.flatMap((account) => account.taskLists.map((taskList) => taskList.id)),
    [googleAccounts],
  );
  const allTaskListIdsKey = allTaskListIds.join("\t");

  useEffect(() => {
    const availableTaskListIds = new Set(allTaskListIds);

    setSelectedTaskListIds((ids) => {
      if (availableTaskListIds.size === 0) {
        selectedTaskListInitializedRef.current = false;
        return ids.size === 0 ? ids : new Set();
      }

      if (!selectedTaskListInitializedRef.current) {
        selectedTaskListInitializedRef.current = true;
        return availableTaskListIds;
      }

      const nextIds = new Set(
        Array.from(ids).filter((id) => availableTaskListIds.has(id)),
      );

      return equalSet(ids, nextIds) ? ids : nextIds;
    });
  }, [allTaskListIdsKey]);

  const handleToggleTaskList = useCallback((taskListId: string) => {
    setSelectedTaskListIds((ids) => toggleIdInSet(ids, taskListId));
  }, []);

  const calendarEvents = useMemo(() => {
    return [...googleCalendarEvents, ...taskCalendarEvents];
  }, [googleCalendarEvents, taskCalendarEvents]);

  const timelineLanes = useMemo<TimelineLane[]>(() => {
    const appProjectLanes = appProjects.map((project) => ({
      id: project.id,
      label: project.label,
      color: project.color,
      checked: project.checked,
      projectIds: [project.label],
    }));

    const googleCalendarLanes = googleAccounts.flatMap((account) =>
      account.calendars.map((calendar) => ({
        id: `${account.accountId}:${calendar.id}`,
        label: calendar.summaryOverride ?? calendar.summary,
        color: calendar.backgroundColor ?? DEFAULT_TIMELINE_CALENDAR_COLOR,
        checked: account.selectedCalendarIds.has(calendar.id),
        calendarIds: [calendar.id],
        projectIds: [
          calendar.id,
          calendar.summary,
          calendar.summaryOverride,
          calendar.description,
        ].filter((value): value is string => Boolean(value)),
      })),
    );

    return [...appProjectLanes, ...googleCalendarLanes];
  }, [appProjects, googleAccounts]);

  const sidebarMonthDate =
    selectedViewMode === "month" ? monthTitleDate : titleDate;

  const sidebarSelectedRange = useMemo(() => {
    if (activeMode !== "timeline") return null;

    if (selectedViewMode === "week") {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: C.WEEK_STARTS_ON_MONDAY }),
        end: endOfWeek(selectedDate, { weekStartsOn: C.WEEK_STARTS_ON_MONDAY }),
      };
    }

    if (selectedViewMode === "month") {
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      };
    }

    return null;
  }, [activeMode, selectedDate, selectedViewMode]);

  const canShowDayDetailPanel =
    activeMode === "calendar" && selectedViewMode === "month";

  const measuredCanFitDayDetailPanel =
    availableCalendarBodyWidth === 0 ||
    availableCalendarBodyWidth >= DAY_DETAIL_PANEL_AUTO_OPEN_MIN_BODY_WIDTH_PX;

  useEffect(() => {
    if (!canShowDayDetailPanel || availableCalendarBodyWidth === 0) return;

    setCanFitDayDetailPanel(measuredCanFitDayDetailPanel);
    setIsDayDetailPanelOpen(measuredCanFitDayDetailPanel);
  }, [availableCalendarBodyWidth, canShowDayDetailPanel, measuredCanFitDayDetailPanel]);

  const showDayDetailPanel =
    canShowDayDetailPanel && canFitDayDetailPanel && isDayDetailPanelOpen;

  const isDayDetailPanelCollapsed =
    canShowDayDetailPanel && !showDayDetailPanel;

  const isMonthCalendarView =
    activeMode === "calendar" && selectedViewMode === "month";

  const hasTrailingPanel = showDayDetailPanel;

  const viewHeaderRightPaddingPx = canShowDayDetailPanel && canFitDayDetailPanel
    ? VIEW_HEADER_CONTROLS_RIGHT_INSET_PX
    : 0;

  const dayDetailToggleLabel = showDayDetailPanel
    ? "日詳細パネルを閉じる"
    : "日詳細パネルを開く";

  const handleToggleDayDetailPanel = useCallback(() => {
    if (!canShowDayDetailPanel || !canFitDayDetailPanel) return;

    setIsDayDetailPanelOpen((isOpen) => !isOpen);
  }, [canFitDayDetailPanel, canShowDayDetailPanel]);

  const handleSidebarSelectDateAndOpen = useCallback(
    (date: Date) => {
      handleSidebarSelectDate(date);

      if (canShowDayDetailPanel && canFitDayDetailPanel) {
        setIsDayDetailPanelOpen(true);
      }
    },
    [canFitDayDetailPanel, canShowDayDetailPanel, handleSidebarSelectDate],
  );

  const handleMonthCellSelectDateAndOpen = useCallback(
    (date: Date) => {
      handleMonthCellSelectDate(date);

      if (canFitDayDetailPanel) {
        setIsDayDetailPanelOpen(true);
      }
    },
    [canFitDayDetailPanel, handleMonthCellSelectDate],
  );

  const renderViewHeader = (className: string) => {
    const headerTitleDate =
      selectedViewMode === "month" ? monthTitleDate : titleDate;
    const headerClassName = className.replace(
      "justify-between",
      "justify-start gap-3",
    );

    return (
      <div className={headerClassName} style={{ paddingRight: viewHeaderRightPaddingPx }}>
        <h1 className="shrink-0 truncate text-[17px] font-semibold tracking-[-0.01em] text-[#1c1c1e]">
          {format(headerTitleDate, monthLabelFormat, { locale: dateFnsLocale })}
        </h1>

        <div className="flex shrink-0 items-center gap-2">
          <ViewModeDropdown
            value={selectedViewMode}
            onChange={handleSelectViewMode}
            options={viewOptions}
          />

          <TodayBar
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToday={handleToday}
          />
        </div>
      </div>
    );
  };

  return (
    <CarvePanelShell
      toolbar={(
        <CalendarWorkspaceToolbar
          activeMode={activeMode}
          viewMode={selectedViewMode}
          onSelectCalendar={() => setActiveMode("calendar")}
          onSelectTimeline={() => setActiveMode("timeline")}
          onSelectTask={() => setActiveMode("task")}
          onSelectViewMode={handleSelectViewMode}
        />
      )}
      overlay={
        canShowDayDetailPanel && canFitDayDetailPanel ? (
          <button
            type="button"
            className={DAY_DETAIL_PANEL_TOGGLE_BUTTON_CLASS}
            onClick={handleToggleDayDetailPanel}
            aria-label={dayDetailToggleLabel}
            aria-pressed={showDayDetailPanel}
            aria-expanded={showDayDetailPanel}
          >
            <SidebarOpenIcon className="h-4 w-4 scale-x-[-1] text-[#8c8c8c]" />
          </button>
        ) : null
      }
      leftPanel={(
        <CalendarSidebar
          monthDate={sidebarMonthDate}
          selectedDate={selectedDate}
          selectedRange={sidebarSelectedRange}
          activeMode={activeMode}
          appProjects={appProjects}
          googleAccounts={googleAccounts}
          isAnyCalendarConnecting={isAnyCalendarConnecting}
          selectedTaskListIds={selectedTaskListIds}
          onSelectDate={handleSidebarSelectDateAndOpen}
          onPreviousMonth={handleSidebarPreviousMonth}
          onNextMonth={handleSidebarNextMonth}
          onAddCalendar={addGoogleCalendar}
          onAddProject={handleAddAppProject}
          onToggleProject={handleToggleAppProject}
          onReconnectAccount={(accountId) => {
            void reconnectGoogleAccount(accountId);
          }}
          onToggleCalendar={toggleGoogleCalendar}
          onToggleTaskList={handleToggleTaskList}
        />
      )}
      rightPanel={
        showDayDetailPanel ? (
          <DayDetailPanel
            selectedDate={selectedDate}
            events={calendarEvents}
            isOpen
          />
        ) : null
      }
      hasTrailingPanel={hasTrailingPanel}
      viewportRef={contentViewportRef}
    >
      {activeMode === "task" ? (
        <CarvePanel>
          <TaskView
            googleAccounts={googleAccounts}
            selectedTaskListIds={selectedTaskListIds}
            onRefreshGoogleTasks={refreshGoogleTasks}
            onCreateGoogleTask={createGoogleTask}
            onUpdateGoogleTask={updateGoogleTask}
            onMoveGoogleTaskList={moveGoogleTaskList}
            onDeleteGoogleTask={deleteGoogleTask}
          />
        </CarvePanel>
      ) : isMonthCalendarView ? (
        <CarvePanel hasTrailingPanel={hasTrailingPanel}>
          {renderViewHeader(
            "mb-2 flex shrink-0 items-center justify-start gap-3 px-5 pt-4",
          )}

          <div
            className={cn(
              "ml-4 flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0",
              IOS_CALENDAR_MONTH_SURFACE_CLASS,
              isDayDetailPanelCollapsed
                ? "mr-0 rounded-tl-[22px] rounded-tr-none border-r-0"
                : "mr-4 rounded-t-[22px]",
            )}
          >
            <CalendarMonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              scrollTargetToken={monthScrollTargetToken}
              visibleEvents={calendarEvents}
              onSelectDate={handleMonthCellSelectDateAndOpen}
              onVisibleMonthChange={handleVisibleMonthChange}
              onRenderedRangeChange={handleMonthRenderedRangeChange}
            />
          </div>
        </CarvePanel>
      ) : (
        <CarvePanel>
          {renderViewHeader(
            "mb-2 flex shrink-0 items-center justify-start gap-3 px-5 pt-4",
          )}

          <div
            className={cn(
              "ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-[22px] rounded-tr-none border-0",
              activeMode === "timeline"
                ? IOS_CALENDAR_SURFACE_CLASS
                : IOS_CALENDAR_WEEKDAY_SURFACE_CLASS,
            )}
          >
            {activeMode === "timeline" ? (
              <CalendarTimelineDayView
                viewMode={selectedViewMode}
                anchorDate={currentDate}
                timelineUnitBuffer={timelineUnitBuffer}
                selectedDate={selectedDate}
                dayColumnWidth={C.TIMELINE_DAY_COLUMN_WIDTH}
                laneLabelWidth={C.TIMELINE_LANE_LABEL_WIDTH}
                rowCount={C.TIMELINE_SKELETON_ROW_COUNT}
                lanes={timelineLanes}
                visibleEvents={calendarEvents}
                scrollContainerRef={scrollContainerRef}
                onScroll={handleCalendarScroll}
                onSelectDate={handleTimelineSelectDate}
              />
            ) : (
              <CalendarWeekDayGrid
                headerScrollRef={headerScrollRef}
                allDayScrollRef={allDayScrollRef}
                scrollContainerRef={scrollContainerRef}
                visibleDays={visibleDays}
                visibleEvents={calendarEvents}
                calendarDayColumnWidth={calendarDayColumnWidth}
                timelineGridStyle={timelineGridStyle}
                onScroll={handleCalendarScroll}
                selectedDate={selectedDate}
                onSelectDate={handleSidebarSelectDate}
              />
            )}
          </div>
        </CarvePanel>
      )}
    </CarvePanelShell>
  );
};