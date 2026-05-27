import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import type { PlanResultMode } from "@/chip/toggle/Toggle.planresult";
import { CarvePanel, CarvePanelShell } from "@/components/panel/CarvePanel.desktop";
import { useAuthSession } from "@/contexts/AuthContext";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarYearView } from "@/features/calendar/grid/CalendarView.year";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import { CalendarSidebar } from "@/features/calendar/panel/CalendarSidebar";
import type { AppCalendarItem, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { TaskView } from "@/features/calendar/task/TaskView";
import { useTaskCalendarEvents } from "@/features/calendar/task/hooks/useTaskCalendarEvents";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { CalendarPieChartView } from "@/features/calendar/view/CalendarPieChartView";
import { ScheduleScreenHeaderDesktop } from "@/features/header/ScheduleScreenHeader.desktop";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";
import { CalendarWorkspaceToolbar } from "@/pane/header/ScheduleToolbar";

type StoredAppCalendarItem = Partial<AppCalendarItem>;

const IOS_CALENDAR_MONTH_SURFACE_CLASS =
  "border-transparent bg-[rgba(255,255,255,0.92)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";

const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS =
  "border-transparent bg-white shadow-none";

const APP_PROJECTS_STORAGE_KEY = "flashcard-master:schedule:app-projects";
const SELECTED_TASK_LISTS_STORAGE_KEY_PREFIX = "flashcard-master:schedule:selected-google-task-list-ids";
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

const getSelectedTaskListsStorageKey = (userId: string): string =>
  `${SELECTED_TASK_LISTS_STORAGE_KEY_PREFIX}:${userId}`;

const readStoredSelectedTaskListIds = (storageKey: string): Set<string> | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      ),
    );
  } catch {
    return null;
  }
};

const persistSelectedTaskListIds = (storageKey: string, ids: Set<string>) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // localStorage が利用できない環境でも、画面上の選択状態は維持する。
  }
};

const hasEqualSetValues = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false;

  return Array.from(a).every((value) => b.has(value));
};

export const ScheduleScreen = ({
  initialActiveMode,
  onClose: _onClose,
}: ScheduleScreenProps) => {
  const pane = useScheduleScreen({ initialActiveMode });
  const { currentUser } = useAuthSession();
  const taskCalendarEvents = useTaskCalendarEvents();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const [appProjects, setAppProjects] = useState<AppCalendarItem[]>(readStoredAppProjects);
  const [planResultModes, setPlanResultModes] = useState<PlanResultMode[]>([
    ...DEFAULT_PLAN_RESULT_MODES,
  ]);
  const selectedTaskListsStorageKey = useMemo(
    () => getSelectedTaskListsStorageKey(currentUser?.uid ?? "anonymous"),
    [currentUser?.uid],
  );
  const [selectedTaskListIds, setSelectedTaskListIds] = useState<Set<string>>(
    () => readStoredSelectedTaskListIds(getSelectedTaskListsStorageKey("anonymous")) ?? new Set(),
  );
  const deferredSelectedTaskListIds = useDeferredValue(selectedTaskListIds);
  const selectedTaskListInitializedRef = useRef(false);

  const viewOptions = useMemo(
    () => [
      { value: "year", label: t.viewYear },
      { value: "month", label: t.viewMonth },
      { value: "week", label: t.viewWeek },
      { value: "threeDays", label: t.viewThreeDays },
      { value: "days", label: t.viewDay },
      { value: "pieChart", label: t.viewPieChart },
    ] as const,
    [t.viewDay, t.viewMonth, t.viewPieChart, t.viewThreeDays, t.viewWeek, t.viewYear],
  );

  const {
    activeMode,
    selectedViewMode,
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
    timelineGridStyle,
    headerScrollRef,
    allDayScrollRef,
    scrollContainerRef,
    contentViewportRef,
    handleCalendarScroll,
    setActiveMode,
    handleSelectViewMode,
    handleSidebarSelectDate,
    handleSidebarPreviousMonth,
    handleSidebarNextMonth,
    handleVisibleMonthChange,
    handlePrevious,
    handleNext,
    handleToday,
    handleMonthCellSelectDate,
    handleMonthRenderedRangeChange,
    handleYearRenderedRangeChange,
    addGoogleCalendar,
    reconnectGoogleAccount,
    toggleGoogleCalendar,
    refreshGoogleTasks,
    retryGoogleTaskLists,
    createGoogleTask,
    updateGoogleTask,
    moveGoogleTaskList,
    deleteGoogleTask,
  } = pane;

  useEffect(() => {
    persistAppProjects(appProjects);
  }, [appProjects]);

  useEffect(() => {
    const storedIds = readStoredSelectedTaskListIds(selectedTaskListsStorageKey);
    selectedTaskListInitializedRef.current = storedIds !== null;
    setSelectedTaskListIds(storedIds ?? new Set());
  }, [selectedTaskListsStorageKey]);

  useEffect(() => {
    if (!selectedTaskListInitializedRef.current) return;
    persistSelectedTaskListIds(selectedTaskListsStorageKey, selectedTaskListIds);
  }, [selectedTaskListIds, selectedTaskListsStorageKey]);

  const handleAddAppProject = useCallback((projectName: string) => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) return;

    setAppProjects((projects) => {
      const duplicateProject = projects.find(
        (project) => project.label.trim().toLowerCase() === trimmedProjectName.toLowerCase(),
      );

      if (duplicateProject) {
        return projects.map((project) =>
          project.id === duplicateProject.id ? { ...project, checked: true } : project,
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
        project.id === projectId ? { ...project, checked: !project.checked } : project,
      ),
    );
  }, []);

  const allTaskListIds = useMemo(
    () => googleAccounts.flatMap((account) => account.taskLists.map((taskList) => taskList.id)),
    [googleAccounts],
  );
  const allTaskListIdsKey = allTaskListIds.join("\t");

  useEffect(() => {
    setSelectedTaskListIds((ids) => {
      if (allTaskListIds.length === 0) {
        return ids.size === 0 ? ids : new Set();
      }

      if (!selectedTaskListInitializedRef.current) {
        selectedTaskListInitializedRef.current = true;
        return new Set(allTaskListIds);
      }

      const availableTaskListIds = new Set(allTaskListIds);
      const nextIds = new Set<string>();

      for (const id of ids) {
        if (availableTaskListIds.has(id)) {
          nextIds.add(id);
        }
      }

      return hasEqualSetValues(ids, nextIds) ? ids : nextIds;
    });
  }, [allTaskListIds, allTaskListIdsKey, selectedTaskListsStorageKey]);

  const handleToggleTaskList = useCallback((taskListId: string) => {
    setSelectedTaskListIds((ids) => {
      const nextIds = new Set(ids);

      if (nextIds.has(taskListId)) {
        nextIds.delete(taskListId);
        return nextIds;
      }

      nextIds.add(taskListId);
      return nextIds;
    });
  }, []);

  const calendarEvents = useMemo(() => {
    return [...googleCalendarEvents, ...taskCalendarEvents];
  }, [googleCalendarEvents, taskCalendarEvents]);
  const deferredCalendarEvents = useDeferredValue(calendarEvents);

  const sidebarMonthDate =
    selectedViewMode === "month" ? monthTitleDate : titleDate;

  const isYearCalendarView =
    activeMode === "calendar" && selectedViewMode === "year";

  const isMonthCalendarView =
    activeMode === "calendar" && selectedViewMode === "month";

  const isPieChartCalendarView =
    activeMode === "calendar" && selectedViewMode === "pieChart";

  const canShowPlanResultToggle =
    activeMode === "calendar" && PLAN_RESULT_TOGGLE_VIEW_MODES.has(selectedViewMode);

  const headerTitleDate =
    selectedViewMode === "month"
      ? monthTitleDate
      : isPieChartCalendarView
        ? selectedDate
        : titleDate;

  const headerTitleLabel = selectedViewMode === "year"
    ? format(headerTitleDate, "yyyy年", { locale: dateFnsLocale })
    : format(headerTitleDate, isPieChartCalendarView ? "yyyy年M月d日" : monthLabelFormat, { locale: dateFnsLocale });

  return (
    <CarvePanelShell
      toolbar={(
        <CalendarWorkspaceToolbar
          activeMode={activeMode}
          viewMode={selectedViewMode}
          onSelectCalendar={() => setActiveMode("calendar")}
          onSelectTask={() => setActiveMode("task")}
          onSelectViewMode={handleSelectViewMode}
        />
      )}
      leftPanel={(
        <CalendarSidebar
          monthDate={sidebarMonthDate}
          selectedDate={selectedDate}
          selectedRange={null}
          activeMode={activeMode}
          appProjects={appProjects}
          googleAccounts={googleAccounts}
          isAnyCalendarConnecting={isAnyCalendarConnecting}
          selectedTaskListIds={selectedTaskListIds}
          onSelectDate={handleSidebarSelectDate}
          onPreviousMonth={handleSidebarPreviousMonth}
          onNextMonth={handleSidebarNextMonth}
          onAddCalendar={addGoogleCalendar}
          onAddProject={handleAddAppProject}
          onToggleProject={handleToggleAppProject}
          onReconnectAccount={(accountId) => {
            void reconnectGoogleAccount(accountId);
          }}
          onRetryTaskLists={retryGoogleTaskLists}
          onToggleCalendar={toggleGoogleCalendar}
          onToggleTaskList={handleToggleTaskList}
        />
      )}
      viewportRef={contentViewportRef}
    >
      <CarvePanel>
        {activeMode !== "task" && (
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
        )}

        {activeMode === "task" ? (
          <div className="ml-0 mr-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-tl-[22px] rounded-tr-none border-0 bg-white">
            <TaskView
              googleAccounts={googleAccounts}
              selectedTaskListIds={deferredSelectedTaskListIds}
              onRefreshGoogleTasks={refreshGoogleTasks}
              onCreateGoogleTask={createGoogleTask}
              onUpdateGoogleTask={updateGoogleTask}
              onMoveGoogleTaskList={moveGoogleTaskList}
              onDeleteGoogleTask={deleteGoogleTask}
            />
          </div>
        ) : isYearCalendarView ? (
          <div className="ml-4 mr-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <CalendarYearView
              yearDate={currentDate}
              selectedDate={selectedDate}
              visibleEvents={deferredCalendarEvents}
              onSelectDate={handleMonthCellSelectDate}
              onRenderedRangeChange={handleYearRenderedRangeChange}
            />
          </div>
        ) : isPieChartCalendarView ? (
          <div className="ml-4 mr-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <CalendarPieChartView
              selectedDate={selectedDate}
              events={deferredCalendarEvents}
              appProjects={appProjects}
              googleAccounts={googleAccounts}
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
              timelineGridStyle={timelineGridStyle}
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