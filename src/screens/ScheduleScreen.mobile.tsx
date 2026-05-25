import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/dropdownchip/ViewModeDropdownChip";
import { SidebarPanelIcon, TaskIcon } from "@/components/icons/icons.schedule";
import { CalendarIcon, LibraryIcon, SettingIcon } from "@/components/icons/icons.sidebar";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import { CalendarTimelineDayView, type TimelineLane } from "@/features/calendar/grid/TimelineDayView";
import { CalendarSidebar } from "@/features/calendar/panel/CalendarSidebar";
import type { AppCalendarItem, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { TaskView } from "@/features/calendar/task/TaskView";
import { useTaskCalendarEvents } from "@/features/calendar/task/hooks/useTaskCalendarEvents";
import { CalendarWorkspaceToolbar } from "@/features/calendar/toolbar/ScheduleToolbar";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

const IOS_CALENDAR_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const IOS_CALENDAR_MONTH_SURFACE_CLASS = "border-transparent bg-[rgba(255,255,255,0.94)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";
const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS = "border-transparent bg-white shadow-none";
const APP_PROJECTS_STORAGE_KEY = "flashcard-master:schedule:app-projects";
const DEFAULT_TIMELINE_CALENDAR_COLOR = "#74798b";
const APP_PROJECT_COLORS = ["#34c759", "#ff3b30", "#4f8ce7", "#ffd166", "#9adfe7", "#66a77a", "#9ca3ff"];

type StoredAppCalendarItem = Partial<AppCalendarItem>;

const createAppProjectId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `app-project:${crypto.randomUUID()}`;
  }

  return `app-project:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
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
          color: typeof project.color === "string" ? project.color : APP_PROJECT_COLORS[index % APP_PROJECT_COLORS.length],
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

const equalSet = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false;

  for (const value of a) {
    if (!b.has(value)) return false;
  }

  return true;
};

const DirectoryIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path d="M4 7.5C4 5.567 5.567 4 7.5 4H9.4C10.079 4 10.724 4.296 11.167 4.811L12.19 6H16.5C18.433 6 20 7.567 20 9.5V16.5C20 18.433 18.433 20 16.5 20H7.5C5.567 20 4 18.433 4 16.5V7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 12H16M8 15H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MOBILE_SCHEDULE_STYLE = `
  @media (max-width: 767px) {
    .schedule-mobile-month-surface .calendar-month-view {
      --calendar-month-row-height: 82px !important;
    }

    .schedule-mobile-month-surface .calendar-month-row-boundary-resize-handle {
      display: none !important;
    }
  }
`;

const MOBILE_SOURCES_PANEL_CLASS = "mx-3 mb-5 overflow-hidden rounded-[24px] border border-[#eeeeee] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] [&>aside]:h-auto [&>aside]:w-full [&>aside]:overflow-visible [&>aside]:pb-3 [&>aside]:pl-0 [&>aside]:pr-0 [&>aside]:pt-0 [&>aside>section:first-child]:hidden [&>aside>div:first-of-type]:hidden [&>aside>nav]:max-h-[360px] [&>aside>nav]:overflow-y-auto [&>aside>nav]:px-2 [&>aside>nav]:pb-3 [&>aside>nav]:pt-3";

export const ScheduleScreen = ({ initialActiveMode, onClose }: ScheduleScreenProps) => {
  const pane = useScheduleScreen({ initialActiveMode });
  const taskCalendarEvents = useTaskCalendarEvents();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedTaskListInitializedRef = useRef(false);
  const [appProjects, setAppProjects] = useState<AppCalendarItem[]>(readStoredAppProjects);
  const [selectedTaskListIds, setSelectedTaskListIds] = useState<Set<string>>(() => new Set());
  const deferredSelectedTaskListIds = useDeferredValue(selectedTaskListIds);

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

  const viewOptions = useMemo(() => [
    { value: "month", label: t.viewMonth },
    { value: "week", label: t.viewWeek },
    { value: "days", label: t.viewDay },
  ] as const, [t.viewDay, t.viewMonth, t.viewWeek]);

  useEffect(() => {
    persistAppProjects(appProjects);
  }, [appProjects]);

  const handleAddAppProject = useCallback((projectName: string) => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) return;

    setAppProjects((projects) => {
      const duplicateProject = projects.find((project) => project.label.trim().toLowerCase() === trimmedProjectName.toLowerCase());

      if (duplicateProject) {
        return projects.map((project) => project.id === duplicateProject.id ? { ...project, checked: true } : project);
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
    setAppProjects((projects) => projects.map((project) => project.id === projectId ? { ...project, checked: !project.checked } : project));
  }, []);

  const allTaskListIds = useMemo(() => googleAccounts.flatMap((account) => account.taskLists.map((taskList) => taskList.id)), [googleAccounts]);
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

      const nextIds = new Set(Array.from(ids).filter((id) => availableTaskListIds.has(id)));
      return equalSet(ids, nextIds) ? ids : nextIds;
    });
    // allTaskListIdsKey でリストの実質的な変化だけを検知する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTaskListIdsKey]);

  const handleToggleTaskList = useCallback((taskListId: string) => {
    setSelectedTaskListIds((ids) => {
      const next = new Set(ids);

      if (next.has(taskListId)) {
        next.delete(taskListId);
      } else {
        next.add(taskListId);
      }

      return next;
    });
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

    const googleCalendarLanes = googleAccounts.flatMap((account) => account.calendars.map((calendar) => ({
      id: `${account.accountId}:${calendar.id}`,
      label: calendar.summaryOverride ?? calendar.summary,
      color: calendar.backgroundColor ?? DEFAULT_TIMELINE_CALENDAR_COLOR,
      checked: account.selectedCalendarIds.has(calendar.id),
      calendarIds: [calendar.id],
      projectIds: [calendar.id, calendar.summary, calendar.summaryOverride, calendar.description].filter((value): value is string => Boolean(value)),
    })));

    return [...appProjectLanes, ...googleCalendarLanes];
  }, [appProjects, googleAccounts]);

  const sidebarMonthDate = selectedViewMode === "month" ? monthTitleDate : titleDate;
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

  const isMonthCalendarView = activeMode === "calendar" && selectedViewMode === "month";
  const headerTitleDate = selectedViewMode === "month" ? monthTitleDate : titleDate;

  const handleSelectDate = useCallback((date: Date) => {
    if (activeMode === "timeline") {
      handleTimelineSelectDate(date);
      return;
    }

    if (selectedViewMode === "month") {
      handleMonthCellSelectDate(date);
      return;
    }

    handleSidebarSelectDate(date);
  }, [activeMode, handleMonthCellSelectDate, handleSidebarSelectDate, handleTimelineSelectDate, selectedViewMode]);

  const mobileNavItems = useMemo(() => [
    { key: "schedule", label: "スケジュール", path: "/schedule", icon: CalendarIcon },
    { key: "library", label: "ライブラリ", path: "/library", icon: LibraryIcon },
    { key: "tasks", label: "タスク", path: "/tasks", icon: TaskIcon },
    { key: "directory", label: "一覧", path: "/directory", icon: DirectoryIcon },
    { key: "settings", label: "設定", path: "/settings", icon: SettingIcon },
  ], []);

  const renderViewHeader = (className: string) => {
    return (
      <div className={className}>
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]" onClick={handlePrevious} aria-label={t.previousLabel}>
            ‹
          </button>
          <h1 className="truncate text-[19px] font-bold tracking-[-0.03em] text-[#1c1c1e]">
            {format(headerTitleDate, monthLabelFormat, { locale: dateFnsLocale })}
          </h1>
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]" onClick={handleNext} aria-label={t.nextLabel}>
            ›
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ViewModeDropdown value={selectedViewMode} onChange={handleSelectViewMode} options={viewOptions} />
          <TodayBar onPrevious={handlePrevious} onNext={handleNext} onToday={handleToday} />
        </div>
      </div>
    );
  };

  const renderCalendarContent = () => {
    if (activeMode === "task") {
      return (
        <CarvePanel className="mx-3 min-h-[calc(100dvh-250px)] rounded-[24px] border-[#eeeeee]">
          <TaskView googleAccounts={googleAccounts} selectedTaskListIds={deferredSelectedTaskListIds} onRefreshGoogleTasks={refreshGoogleTasks} onCreateGoogleTask={createGoogleTask} onUpdateGoogleTask={updateGoogleTask} onMoveGoogleTaskList={moveGoogleTaskList} onDeleteGoogleTask={deleteGoogleTask} />
        </CarvePanel>
      );
    }

    if (isMonthCalendarView) {
      return (
        <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">
          {renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}
          <div className={cn("schedule-mobile-month-surface mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border", IOS_CALENDAR_MONTH_SURFACE_CLASS)}>
            <CalendarMonthView currentDate={currentDate} selectedDate={selectedDate} scrollTargetToken={monthScrollTargetToken} visibleEvents={calendarEvents} onSelectDate={handleSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onRenderedRangeChange={handleMonthRenderedRangeChange} />
          </div>
        </CarvePanel>
      );
    }

    return (
      <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">
        {renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}
        <div className={cn("mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border", activeMode === "timeline" ? IOS_CALENDAR_SURFACE_CLASS : IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}>
          {activeMode === "timeline" ? (
            <CalendarTimelineDayView viewMode={selectedViewMode} anchorDate={currentDate} timelineUnitBuffer={timelineUnitBuffer} selectedDate={selectedDate} dayColumnWidth={C.TIMELINE_DAY_COLUMN_WIDTH} laneLabelWidth={132} rowCount={C.TIMELINE_SKELETON_ROW_COUNT} lanes={timelineLanes} visibleEvents={calendarEvents} scrollContainerRef={scrollContainerRef} onScroll={handleCalendarScroll} onSelectDate={handleTimelineSelectDate} />
          ) : (
            <CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={calendarEvents} calendarDayColumnWidth={calendarDayColumnWidth} timelineGridStyle={timelineGridStyle} onScroll={handleCalendarScroll} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} />
          )}
        </div>
      </CarvePanel>
    );
  };

  return (
    <div ref={contentViewportRef} className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-[#1c1c1e]">
      <style>{MOBILE_SCHEDULE_STYLE}</style>

      <header className="shrink-0 bg-[linear-gradient(180deg,#08111f_0%,#0b1a3a_58%,#071124_100%)] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white shadow-[0_12px_28px_rgba(4,10,24,0.22)]">
        <div className="flex h-11 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/82 transition hover:bg-white/10" aria-label="メニュー">
              <SidebarPanelIcon className="h-5 w-5" />
            </button>
            <CalendarIcon className="h-5 w-5 shrink-0 text-white/82" />
            <h1 className="truncate text-[20px] font-bold tracking-[-0.03em]">スケジュール</h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onClose ? (
              <button type="button" className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-semibold text-white/86" onClick={onClose}>
                Close
              </button>
            ) : null}
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-[13px] font-bold text-white/86" onClick={() => { void addGoogleCalendar(); }} aria-label={t.addGoogleCalendar}>
              A
            </button>
          </div>
        </div>
      </header>

      <div className="shrink-0 rounded-t-[22px] border-b border-[#eeeeee] bg-white px-3 py-2 shadow-[0_-1px_0_rgba(255,255,255,0.9),0_6px_18px_rgba(15,23,42,0.07)] [&_.calendar-workspace-toolbar]:h-11 [&_.calendar-workspace-toolbar]:overflow-visible [&_.calendar-workspace-toolbar]:bg-transparent [&_.calendar-workspace-toolbar]:pr-0">
        <CalendarWorkspaceToolbar activeMode={activeMode} viewMode={selectedViewMode} onSelectCalendar={() => setActiveMode("calendar")} onSelectTimeline={() => setActiveMode("timeline")} onSelectTask={() => setActiveMode("task")} onSelectViewMode={handleSelectViewMode} />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto bg-white pb-[calc(env(safe-area-inset-bottom)+92px)] pt-3">
        <div className="flex flex-col gap-4">
          {renderCalendarContent()}

          <section className={MOBILE_SOURCES_PANEL_CLASS}>
            <CalendarSidebar monthDate={sidebarMonthDate} selectedDate={selectedDate} selectedRange={sidebarSelectedRange} activeMode={activeMode} appProjects={appProjects} googleAccounts={googleAccounts} isAnyCalendarConnecting={isAnyCalendarConnecting} selectedTaskListIds={selectedTaskListIds} onSelectDate={handleSelectDate} onPreviousMonth={handleSidebarPreviousMonth} onNextMonth={handleSidebarNextMonth} onAddCalendar={addGoogleCalendar} onAddProject={handleAddAppProject} onToggleProject={handleToggleAppProject} onReconnectAccount={(accountId) => { void reconnectGoogleAccount(accountId); }} onToggleCalendar={toggleGoogleCalendar} onToggleTaskList={handleToggleTaskList} />
          </section>
        </div>
      </main>

      <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[linear-gradient(180deg,#08111f_0%,#0b1a3a_58%,#050812_100%)] px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-[0_-14px_34px_rgba(4,10,24,0.25)]" aria-label="モバイルナビゲーション">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <button key={item.key} type="button" className={cn("flex min-w-0 flex-col items-center gap-1 rounded-[14px] px-1 py-2 text-[10px] font-semibold transition", isActive ? "bg-white/10 text-white" : "text-white/62 hover:bg-white/8 hover:text-white/86")} onClick={() => { void navigate(item.path); }} aria-current={isActive ? "page" : undefined}>
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-[#8fb4ff]" : "text-current")} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
