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
import { cn } from "@/lib/utils";

const VIEW_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "days", label: "Day" },
] as const;

const DAY_DETAIL_PANEL_WIDTH = 260;
const MONTH_HEADER_RIGHT_PADDING = DAY_DETAIL_PANEL_WIDTH + 16;

export const SchedulePane = ({ onClose: _onClose }: SchedulePaneProps) => {
  const pane = useSchedulePane();
  const taskCalendarEvents = useTaskCalendarEvents();
  const [isDayDetailPanelOpen, setIsDayDetailPanelOpen] = useState(true);

  const {
    activeMode,
    selectedViewMode,
    currentDate,
    selectedDate,
    monthLabel,
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
    handleTimelineScroll,
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

  const handleCloseDayDetailPanel = useCallback(() => {
    setIsDayDetailPanelOpen(false);
  }, []);

  const handleOpenDayDetailPanel = useCallback(() => {
    setIsDayDetailPanelOpen(true);
  }, []);

  const renderViewHeader = (className: string) => (
    <div
      className={className}
      style={
        canShowDayDetailPanel && !showDayDetailPanel
          ? { paddingRight: MONTH_HEADER_RIGHT_PADDING }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        {selectedViewMode === "month" ? (
          <h1 className="truncate text-[16px] font-semibold text-[#24272f]">
            {format(monthTitleDate, "MMMM yyyy")}
          </h1>
        ) : monthLabel ? (
          <h1 className="truncate text-[16px] font-semibold text-[#24272f]">
            {monthLabel}
          </h1>
        ) : (
          <div aria-hidden="true" className="h-6 w-24" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <ViewModeDropdown
          value={selectedViewMode}
          onChange={handleSelectViewMode}
          options={VIEW_OPTIONS}
        />

        <TodayBar
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
        />

        {canShowDayDetailPanel ? (
          <button
            type="button"
            aria-label={showDayDetailPanel ? "日付詳細を閉じる" : "日付詳細を開く"}
            title={showDayDetailPanel ? "日付詳細を閉じる" : "日付詳細を開く"}
            onClick={
              showDayDetailPanel
                ? handleCloseDayDetailPanel
                : handleOpenDayDetailPanel
            }
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e2e4e9] bg-white text-[#8f929c] transition-colors hover:bg-[#eef0f3] hover:text-[#20242c]"
          >
            <SidebarPanelIcon
              className={cn(
                "h-4 w-4",
                showDayDetailPanel && "-scale-x-100",
              )}
            />
          </button>
        ) : null}
      </div>
    </div>
  );

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

      <div className="flex min-h-0 flex-1 bg-transparent">
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
              ? "overflow-hidden"
              : isMonthCalendarView
                ? "px-4 pt-0 pb-0"
                : showDayDetailPanel
                  ? "px-3 pt-4"
                  : "px-5 pt-4",
          )}
        >
          {activeMode === "task" ? (
            <TaskView googleAccounts={googleAccounts} />
          ) : isMonthCalendarView ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[24px] border border-b-0 border-[#e3e5ea] bg-[#f0f2f5] shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
              {renderViewHeader(
                "mb-3 flex shrink-0 items-center justify-between px-4 pt-4",
              )}

              <div className="mx-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl border border-b-0 border-[#e9eaed] bg-white">
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
            <>
              {renderViewHeader(
                "mb-4 flex shrink-0 items-center justify-between",
              )}

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
                  onScroll={handleTimelineScroll}
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
                  onScroll={handleTimelineScroll}
                  selectedDate={selectedDate}
                  onSelectDate={handleSidebarSelectDate}
                />
              )}
            </>
          )}
        </div>

        {showDayDetailPanel ? (
          <DayDetailPanel
            selectedDate={selectedDate}
            events={calendarEvents}
          />
        ) : null}
      </div>
    </div>
  );
};