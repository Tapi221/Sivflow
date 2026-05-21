import { useMemo } from "react";
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

import { cn } from "@/lib/utils";

const VIEW_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "days", label: "Day" },
] as const;

export const SchedulePane = ({ onClose: _onClose }: SchedulePaneProps) => {
  const pane = useSchedulePane();
  const taskCalendarEvents = useTaskCalendarEvents();

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
    reconnectGoogleAccount,
    retryGoogleAccountSync,
    toggleGoogleCalendar,
  } = pane;

  const calendarEvents = useMemo(() => {
    return [...googleCalendarEvents, ...taskCalendarEvents];
  }, [googleCalendarEvents, taskCalendarEvents]);

  const sidebarMonthDate =
    selectedViewMode === "month" ? monthTitleDate : titleDate;

  const showDayDetailPanel =
    activeMode === "calendar" && selectedViewMode === "month";

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <CalendarWorkspaceToolbar
        activeMode={activeMode}
        viewMode={selectedViewMode}
        onSelectCalendar={() => setActiveMode("calendar")}
        onSelectTimeline={() => setActiveMode("timeline")}
        onSelectTask={() => setActiveMode("task")}
        onSelectViewMode={handleSelectViewMode}
      />

      <div className="flex min-h-0 flex-1 bg-white">
        <CalendarSidebar
          monthDate={sidebarMonthDate}
          selectedDate={selectedDate}
          googleAccounts={googleAccounts}
          isAnyCalendarConnecting={isAnyCalendarConnecting}
          onSelectDate={handleSidebarSelectDate}
          onPreviousMonth={handleSidebarPreviousMonth}
          onNextMonth={handleSidebarNextMonth}
          onAddCalendar={addGoogleCalendar}
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
              : showDayDetailPanel
                ? "px-3 pt-4"
                : "px-5 pt-4",
          )}
        >
          {activeMode !== "task" && (
            <div className="mb-4 flex shrink-0 items-center justify-between">
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
              </div>
            </div>
          )}

          {activeMode === "task" ? (
            <TaskView googleAccounts={googleAccounts} />
          ) : activeMode === "timeline" ? (
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
          ) : selectedViewMode === "month" ? (
            <CalendarMonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              scrollTargetToken={monthScrollTargetToken}
              visibleEvents={calendarEvents}
              onSelectDate={handleMonthCellSelectDate}
              onVisibleMonthChange={handleVisibleMonthChange}
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
        </div>

        {showDayDetailPanel && (
          <DayDetailPanel
            selectedDate={selectedDate}
            events={calendarEvents}
            onClose={() => setActiveMode("calendar")}
          />
        )}
      </div>
    </div>
  );
};