import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { TodayBar } from "@/features/calendar/chip/TodayBar";
import { ViewModeDropdown } from "@/features/calendar/chip/ViewModeDropdownChip";
import type { SchedulePaneProps } from "./schedulePane.types";
import { CalendarMonthView } from "./grid/CalendarView.month";
import { CalendarWeekDayGrid } from "./grid/Grid.calendar.weekday.desktop";
import { TaskView } from "./task/TaskView";
import { CalendarTimelineDayView } from "./grid/TimelineDayView";
import { useSchedulePane } from "./useSchedulePane";
import { DayDetailPanel } from "./rightpanel/DayDetailPanel";
import { CalendarSidebar } from "./sidepanel/CalendarSidebar";
import { CalendarWorkspaceToolbar } from "./toolbar/ScheduleToolbar";
import { useTaskCalendarEvents } from "./task/useTaskCalendarEvents";
import { SidebarPanelIcon } from "@/components/icons/schedule.icons";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

const CALENDAR_PANEL_SHADOW_CLASS =
  "shadow-[0_-4px_14px_rgba(15,23,42,0.05),0_10px_30px_rgba(15,23,42,0.12)]";

export const SchedulePane = ({ onClose: _onClose }: SchedulePaneProps) => {
  const pane = useSchedulePane();
  const taskCalendarEvents = useTaskCalendarEvents();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const [isDayDetailPanelOpen, setIsDayDetailPanelOpen] = useState(true);

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
    visibleDays,
    googleCalendarEvents,
    googleAccounts,
    isAnyCalendarConnecting,
    calendarDayColumnWidth,
    timelineGridStyle,
    headerScrollRef,
    scrollContainerRef,
    contentViewportRef,
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
    addGoogleCalendar,
    removeGoogleAccount,
    reconnectGoogleAccount,
    retryGoogleAccountSync,
    toggleGoogleCalendar,
  } = pane;

  const calendarEvents = useMemo(() => {
    return [...googleCalendarEvents, ...taskCalendarEvents];
  }, [googleCalendarEvents, taskCalendarEvents]);

  const sidebarMonthDate =
    selectedViewMode === "month" ? monthTitleDate : titleDate;

  const canShowDayDetailPanel =
    activeMode === "calendar" && selectedViewMode === "month";

  const showDayDetailPanel =
    canShowDayDetailPanel && isDayDetailPanelOpen;

  const isDayDetailPanelCollapsed =
    canShowDayDetailPanel && !showDayDetailPanel;

  const isMonthCalendarView =
    activeMode === "calendar" && selectedViewMode === "month";

  const handleSidebarSelectDateAndOpen = useCallback(
    (date: Date) => {
      handleSidebarSelectDate(date);

      if (canShowDayDetailPanel) {
        setIsDayDetailPanelOpen(true);
      }
    },
    [canShowDayDetailPanel, handleSidebarSelectDate],
  );

  const handleMonthCellSelectDateAndOpen = useCallback(
    (date: Date) => {
      handleMonthCellSelectDate(date);
      setIsDayDetailPanelOpen(true);
    },
    [handleMonthCellSelectDate],
  );

  const handleToggleDayDetailPanel = useCallback(() => {
    setIsDayDetailPanelOpen((isOpen) => !isOpen);
  }, []);

  const renderViewHeader = (className: string) => {
    const headerTitleDate =
      selectedViewMode === "month" ? monthTitleDate : titleDate;

    return (
      <div className={className}>
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-[16px] font-semibold text-[#24272f]">
            {format(headerTitleDate, monthLabelFormat, { locale: dateFnsLocale })}
          </h1>
        </div>

        <div className="flex items-center gap-2">
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
    <div className="flex h-full min-h-0 w-full flex-col bg-transparent">
      <CalendarWorkspaceToolbar
        activeMode={activeMode}
        viewMode={selectedViewMode}
        onSelectCalendar={() => setActiveMode("calendar")}
        onSelectTimeline={() => setActiveMode("timeline")}
        onSelectTask={() => setActiveMode("task")}
        onSelectViewMode={handleSelectViewMode}
      />

      <div className="relative flex min-h-0 flex-1 bg-transparent">
        <CalendarSidebar
          monthDate={sidebarMonthDate}
          selectedDate={selectedDate}
          googleAccounts={googleAccounts}
          isAnyCalendarConnecting={isAnyCalendarConnecting}
          onSelectDate={handleSidebarSelectDateAndOpen}
          onPreviousMonth={handleSidebarPreviousMonth}
          onNextMonth={handleSidebarNextMonth}
          onAddCalendar={addGoogleCalendar}
          onRemoveAccount={removeGoogleAccount}
          onReconnectAccount={(accountId) => {
            void reconnectGoogleAccount(accountId);
          }}
          onRetryAccount={(accountId) => {
            void retryGoogleAccountSync(accountId);
          }}
          onToggleCalendar={toggleGoogleCalendar}
        />

        <div
          ref={contentViewportRef}
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col bg-white",
            activeMode === "task"
              ? "pl-4 pr-0 pt-0 pb-0"
              : isMonthCalendarView
                ? isDayDetailPanelCollapsed
                  ? "pl-4 pr-0 pt-0 pb-0"
                  : "px-4 pt-0 pb-0"
                : "pl-4 pr-0 pt-0 pb-0",
          )}
        >
          {activeMode === "task" ? (
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-[24px] rounded-tr-none border border-r-0 border-b-0 border-[#e3e5ea] bg-[#f7f8fa]",
                CALENDAR_PANEL_SHADOW_CLASS,
              )}
            >
              <TaskView googleAccounts={googleAccounts} />
            </div>
          ) : isMonthCalendarView ? (
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-[#e3e5ea] bg-[#f7f8fa]",
                CALENDAR_PANEL_SHADOW_CLASS,
                isDayDetailPanelCollapsed
                  ? "rounded-tl-[24px] rounded-tr-none border-r-0"
                  : "rounded-t-[24px]",
              )}
            >
              {renderViewHeader(
                "mb-3 flex shrink-0 items-center justify-between px-4 pt-4 pr-14",
              )}

              <div
                className={cn(
                  "ml-4 flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-[#e9eaed] bg-white",
                  isDayDetailPanelCollapsed
                    ? "mr-0 rounded-tl-2xl rounded-tr-none border-r-0"
                    : "mr-4 rounded-t-2xl",
                )}
              >
                <CalendarMonthView
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  scrollTargetToken={monthScrollTargetToken}
                  visibleEvents={calendarEvents}
                  onSelectDate={handleMonthCellSelectDateAndOpen}
                  onVisibleMonthChange={handleVisibleMonthChange}
                />
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-[24px] rounded-tr-none border border-r-0 border-b-0 border-[#e3e5ea] bg-[#f7f8fa]",
                CALENDAR_PANEL_SHADOW_CLASS,
              )}
            >
              {renderViewHeader(
                // task view の toolbar 境界線位置 (48px) と揃える
                "mb-1 flex shrink-0 items-center justify-between px-4 pt-4",
              )}

              <div className="ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-2xl rounded-tr-none border border-r-0 border-b-0 border-[#e9eaed] bg-white">
                {activeMode === "timeline" ? (
                  <CalendarTimelineDayView
                    viewMode={selectedViewMode}
                    anchorDate={currentDate}
                    timelineUnitBuffer={{ before: 7, after: 14 }}
                    selectedDate={currentDate}
                    dayColumnWidth={C.TIMELINE_DAY_COLUMN_WIDTH}
                    laneLabelWidth={C.TIMELINE_LANE_LABEL_WIDTH}
                    rowCount={C.TIMELINE_SKELETON_ROW_COUNT}
                    scrollContainerRef={scrollContainerRef}
                    onSelectDate={handleSidebarSelectDate}
                  />
                ) : (
                  <CalendarWeekDayGrid
                    headerScrollRef={headerScrollRef}
                    scrollContainerRef={scrollContainerRef}
                    visibleDays={visibleDays}
                    visibleEvents={calendarEvents}
                    calendarDayColumnWidth={calendarDayColumnWidth}
                    timelineGridStyle={timelineGridStyle}
                    selectedDate={selectedDate}
                    onSelectDate={handleSidebarSelectDate}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {canShowDayDetailPanel ? (
          <DayDetailPanel
            selectedDate={selectedDate}
            events={calendarEvents}
            isOpen={showDayDetailPanel}
          />
        ) : null}

        {canShowDayDetailPanel ? (
          <button
            type="button"
            aria-label={showDayDetailPanel ? "日付詳細を閉じる" : "日付詳細を開く"}
            title={showDayDetailPanel ? "日付詳細を閉じる" : "日付詳細を開く"}
            onClick={handleToggleDayDetailPanel}
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center bg-transparent text-[#8f96a3] hover:text-[#6f7784]"
          >
            <SidebarPanelIcon
              className={cn("h-3.5 w-3.5", showDayDetailPanel && "-scale-x-100")}
            />
          </button>
        ) : null}
      </div>
    </div>
  );
};