import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/toggle/Toggle.calendarviewmode";
import { SidebarPanelIcon } from "@/chip/icons/icons.schedule";
import { CalendarIcon } from "@/chip/icons/icons.sidebar";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import { CalendarTimelineDayView, type TimelineLane } from "@/features/calendar/grid/TimelineDayView";
import type { AppCalendarItem, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { TaskView } from "@/features/calendar/task/TaskView";
import { useTaskCalendarEvents } from "@/features/calendar/task/hooks/useTaskCalendarEvents";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { CalendarPieChartView } from "@/features/calendar/view/CalendarPieChartView";
import { CalendarWorkspaceToolbar } from "@/pane/header/ScheduleToolbar";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

const IOS_CALENDAR_SURFACE_CLASS = "border-transparent bg-white shadow-none";

const IOS_CALENDAR_MONTH_SURFACE_CLASS =
  "border-transparent bg-[rgba(255,255,255,0.94)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";

const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS =
  "border-transparent bg-white shadow-none";

const APP_PROJECTS_STORAGE_KEY = "flashcard-master:schedule:app-projects";
const DEFAULT_TIMELINE_CALENDAR_COLOR = "#74798b";
const MOBILE_TIMELINE_LANE_LABEL_WIDTH = 92;
const APP_PROJECT_COLORS = [
  "#34c759",
  "#ff3b30",
  "#4f8ce7",
  "#ffd166",
  "#9adfe7",
  "#66a77a",
  "#9ca3ff",
];

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

type StoredAppCalendarItem = Partial<AppCalendarItem>;

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

const equalSet = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false;

  for (const value of a) {
    if (!b.has(value)) return false;
  }

  return true;
};

export const ScheduleScreen = ({
  initialActiveMode,
  onClose,
}: ScheduleScreenProps) => {
  const pane = useScheduleScreen({ initialActiveMode });
  const taskCalendarEvents = useTaskCalendarEvents();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const selectedTaskListInitializedRef = useRef(false);
  const [appProjects] = useState<AppCalendarItem[]>(readStoredAppProjects);
  const [selectedTaskListIds, setSelectedTaskListIds] = useState<Set<string>>(
    () => new Set(),
  );
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
    handleVisibleMonthChange,
    handlePrevious,
    handleNext,
    handleToday,
    handleMonthCellSelectDate,
    handleMonthRenderedRangeChange,
    addGoogleCalendar,
    refreshGoogleTasks,
    createGoogleTask,
    updateGoogleTask,
    moveGoogleTaskList,
    deleteGoogleTask,
  } = pane;

  const viewOptions = useMemo(
    () => [
      { value: "month", label: t.viewMonth },
      { value: "week", label: t.viewWeek },
      { value: "threeDays", label: t.viewThreeDays },
      { value: "days", label: t.viewDay },
      { value: "pieChart", label: t.viewPieChart },
    ] as const,
    [t.viewDay, t.viewMonth, t.viewPieChart, t.viewThreeDays, t.viewWeek],
  );

  useEffect(() => {
    persistAppProjects(appProjects);
  }, [appProjects]);

  const allTaskListIds = useMemo(
    () =>
      googleAccounts.flatMap((account) =>
        account.taskLists.map((taskList) => taskList.id),
      ),
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
    // allTaskListIdsKey でリストの実質的な変化だけを検知する。
  }, [allTaskListIds, allTaskListIdsKey]);

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

  const isMonthCalendarView =
    activeMode === "calendar" && selectedViewMode === "month";
  const isPieChartCalendarView =
    activeMode === "calendar" && selectedViewMode === "pieChart";
  const headerTitleDate =
    selectedViewMode === "month" ? monthTitleDate : titleDate;

  const handleSelectDate = useCallback(
    (date: Date) => {
      if (activeMode === "timeline") {
        handleTimelineSelectDate(date);
        return;
      }

      if (selectedViewMode === "month") {
        handleMonthCellSelectDate(date);
        return;
      }

      handleSidebarSelectDate(date);
    },
    [
      activeMode,
      handleMonthCellSelectDate,
      handleSidebarSelectDate,
      handleTimelineSelectDate,
      selectedViewMode,
    ],
  );

  const renderViewHeader = (className: string) => {
    return (
      <div className={className}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]"
            onClick={handlePrevious}
            aria-label={t.previousLabel}
          >
            ‹
          </button>
          <h1 className="truncate text-[19px] font-bold tracking-[-0.03em] text-[#1c1c1e]">
            {format(headerTitleDate, monthLabelFormat, { locale: dateFnsLocale })}
          </h1>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]"
            onClick={handleNext}
            aria-label={t.nextLabel}
          >
            ›
          </button>
        </div>

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

  const renderCalendarContent = () => {
    if (activeMode === "task") {
      return (
        <CarvePanel className="mx-3 min-h-[calc(100dvh-250px)] rounded-[24px] border-[#eeeeee]">
          <TaskView
            googleAccounts={googleAccounts}
            selectedTaskListIds={deferredSelectedTaskListIds}
            onRefreshGoogleTasks={refreshGoogleTasks}
            onCreateGoogleTask={createGoogleTask}
            onUpdateGoogleTask={updateGoogleTask}
            onMoveGoogleTaskList={moveGoogleTaskList}
            onDeleteGoogleTask={deleteGoogleTask}
          />
        </CarvePanel>
      );
    }

    if (isPieChartCalendarView) {
      return (
        <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">
          {renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}
          <div className="mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#eeeeee] bg-white">
            <CalendarPieChartView
              selectedDate={selectedDate}
              events={calendarEvents}
              appProjects={appProjects}
              googleAccounts={googleAccounts}
              className="px-4 pb-4 pt-4"
            />
          </div>
        </CarvePanel>
      );
    }

    if (isMonthCalendarView) {
      return (
        <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">
          {renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}
          <div
            className={cn(
              "schedule-mobile-month-surface mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border",
              IOS_CALENDAR_MONTH_SURFACE_CLASS,
            )}
          >
            <CalendarMonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              scrollTargetToken={monthScrollTargetToken}
              visibleEvents={calendarEvents}
              onSelectDate={handleSelectDate}
              onVisibleMonthChange={handleVisibleMonthChange}
              onRenderedRangeChange={handleMonthRenderedRangeChange}
            />
          </div>
        </CarvePanel>
      );
    }

    return (
      <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">
        {renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}
        <div
          className={cn(
            "mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border",
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
              laneLabelWidth={MOBILE_TIMELINE_LANE_LABEL_WIDTH}
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
    );
  };

  return (
    <div
      ref={contentViewportRef}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-[#1c1c1e]"
    >
      <style>{MOBILE_SCHEDULE_STYLE}</style>

      <header className="shrink-0 bg-[linear-gradient(180deg,#08111f_0%,#0b1a3a_58%,#071124_100%)] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white shadow-[0_12px_28px_rgba(4,10,24,0.22)]">
        <div className="flex h-11 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/82 transition hover:bg-white/10"
              aria-label="メニュー"
            >
              <SidebarPanelIcon className="h-5 w-5" />
            </button>
            <CalendarIcon className="h-5 w-5 shrink-0 text-white/82" />
            <h1 className="truncate text-[20px] font-bold tracking-[-0.03em]">
              スケジュール
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onClose ? (
              <button
                type="button"
                className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-semibold text-white/86"
                onClick={onClose}
              >
                Close
              </button>
            ) : null}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-[13px] font-bold text-white/86"
              onClick={() => {
                void addGoogleCalendar();
              }}
              aria-label={t.addGoogleCalendar}
            >
              A
            </button>
          </div>
        </div>
      </header>

      <div className="shrink-0 rounded-t-[22px] border-b border-[#eeeeee] bg-white px-3 py-2 shadow-[0_-1px_0_rgba(255,255,255,0.9),0_6px_18px_rgba(15,23,42,0.07)] [&_.calendar-workspace-toolbar]:h-11 [&_.calendar-workspace-toolbar]:overflow-visible [&_.calendar-workspace-toolbar]:bg-transparent [&_.calendar-workspace-toolbar]:pr-0">
        <CalendarWorkspaceToolbar
          activeMode={activeMode}
          viewMode={selectedViewMode}
          onSelectCalendar={() => setActiveMode("calendar")}
          onSelectTimeline={() => setActiveMode("timeline")}
          onSelectTask={() => setActiveMode("task")}
          onSelectViewMode={handleSelectViewMode}
        />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
        {renderCalendarContent()}
      </main>
    </div>
  );
};