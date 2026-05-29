import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/toggle/Toggle.calendarviewmode";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import { CalendarWeekDayGrid } from "@/features/calendar/grid/Grid.calendar.weekday.desktop";
import type { AppCalendarItem, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { cn } from "@/lib/utils";
import { CalendarWorkspaceToolbar } from "@/pane.desktop/header/ScheduleToolbar";
import { CalendarPieChartView } from "@/pane.desktop/leftpane/schedule/Calendar.PieChartView";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@shared/i18n/useT";

const IOS_CALENDAR_MONTH_SURFACE_CLASS =
  "border-transparent bg-[rgba(255,255,255,0.94)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";

const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS =
  "border-transparent bg-white shadow-none";

const APP_PROJECTS_STORAGE_KEY = "flashcard-master:schedule:app-projects";
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

export const ScheduleScreen = (_props: ScheduleScreenProps) => {
  const pane = useScheduleScreen();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const [appProjects] = useState<AppCalendarItem[]>(readStoredAppProjects);

  const {
    selectedViewMode,
    currentDate,
    selectedDate,
    titleDate,
    monthTitleDate,
    monthScrollTargetToken,
    visibleDays,
    googleCalendarEvents,
    googleAccounts,
    calendarDayColumnWidth,
    calendarGridStyle,
    headerScrollRef,
    allDayScrollRef,
    scrollContainerRef,
    contentViewportRef,
    handleCalendarScroll,
    handleSelectViewMode,
    handleSidebarSelectDate,
    handleVisibleDateChange,
    handleVisibleMonthChange,
    handlePrevious,
    handleNext,
    handleToday,
    handleMonthCellSelectDate,
    handleMonthRenderedRangeChange,
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

  const isMonthCalendarView = selectedViewMode === "month";
  const isPieChartCalendarView = selectedViewMode === "pieChart";
  const headerTitleDate =
    selectedViewMode === "month"
      ? monthTitleDate
      : isPieChartCalendarView
        ? selectedDate
        : titleDate;
  const headerTitleFormat = isPieChartCalendarView ? "yyyy年M月d日" : monthLabelFormat;

  const handleSelectDate = useCallback(
    (date: Date) => {
      if (selectedViewMode === "month") {
        handleMonthCellSelectDate(date);
        return;
      }

      handleSidebarSelectDate(date);
    },
    [handleMonthCellSelectDate, handleSidebarSelectDate, selectedViewMode],
  );

  const renderViewHeader = (className: string) => {
    return (
      <div className={className}>
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b7b7b7] transition hover:bg-[#f7f7f7] hover:text-[#6e6e73]" onClick={handlePrevious} aria-label={t.previousLabel}>
            ‹
          </button>
          <h1 className="truncate text-[19px] font-bold tracking-[-0.03em] text-[#1c1c1e]">
            {format(headerTitleDate, headerTitleFormat, { locale: dateFnsLocale })}
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
    if (isPieChartCalendarView) {
      return (
        <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">
          {renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}
          <div className="mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#eeeeee] bg-white">
            <CalendarPieChartView days={visibleDays} selectedDate={selectedDate} events={googleCalendarEvents} appProjects={appProjects} googleAccounts={googleAccounts} onSelectDate={handleSidebarSelectDate} onVisibleDateChange={handleVisibleDateChange} />
          </div>
        </CarvePanel>
      );
    }

    if (isMonthCalendarView) {
      return (
        <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">
          {renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}
          <div className={cn("schedule-mobile-month-surface mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border", IOS_CALENDAR_MONTH_SURFACE_CLASS)}>
            <CalendarMonthView currentDate={currentDate} selectedDate={selectedDate} scrollTargetToken={monthScrollTargetToken} visibleEvents={googleCalendarEvents} onSelectDate={handleSelectDate} onVisibleMonthChange={handleVisibleMonthChange} onRenderedRangeChange={handleMonthRenderedRangeChange} />
          </div>
        </CarvePanel>
      );
    }

    return (
      <CarvePanel className="mx-3 min-h-0 rounded-[24px] border-[#eeeeee]">
        {renderViewHeader("flex shrink-0 flex-col gap-3 px-4 pb-3 pt-4")}
        <div className={cn("mx-0 flex h-[586px] min-h-0 flex-col overflow-hidden rounded-[20px] border", IOS_CALENDAR_WEEKDAY_SURFACE_CLASS)}>
          <CalendarWeekDayGrid headerScrollRef={headerScrollRef} allDayScrollRef={allDayScrollRef} scrollContainerRef={scrollContainerRef} visibleDays={visibleDays} visibleEvents={googleCalendarEvents} calendarDayColumnWidth={calendarDayColumnWidth} _calendarDayColumnWidth={calendarDayColumnWidth} calendarGridStyle={calendarGridStyle} onScroll={handleCalendarScroll} selectedDate={selectedDate} onSelectDate={handleSidebarSelectDate} />
        </div>
      </CarvePanel>
    );
  };

  return (
    <div ref={contentViewportRef} className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-[#1c1c1e]">
      <style>{MOBILE_SCHEDULE_STYLE}</style>

      <div className="shrink-0 border-b border-[#eeeeee] bg-white px-3 py-2 [&_.calendar-workspace-toolbar]:h-11 [&_.calendar-workspace-toolbar]:overflow-visible [&_.calendar-workspace-toolbar]:bg-transparent [&_.calendar-workspace-toolbar]:pr-0">
        <CalendarWorkspaceToolbar viewMode={selectedViewMode} onSelectViewMode={handleSelectViewMode} />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
        {renderCalendarContent()}
      </main>
    </div>
  );
};
