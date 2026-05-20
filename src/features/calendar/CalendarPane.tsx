import { useEffect, useState } from "react";

import { format } from "date-fns";

import * as C from "@/features/calendar/calendar.constants.desktop";
import { TodayBar } from "@/features/calendar/chip/TodayBar";
import { ViewModeDropdown } from "@/features/calendar/chip/ViewModeDropdown";

import type { CalendarPaneProps } from "./calendarPane.types";
import { CalendarMonthView } from "./grid/CalendarView.month";
import { CalendarWeekDayGrid } from "./grid/Grid.calendar.weekday.desktop";
import { CalendarTaskView } from "./TaskView";
import { CalendarTimelineDayView } from "./grid/TimelineDayView";
import { useCalendarPane } from "./hooks/useCalendarPane";
import { DayDetailPanel } from "./rightpanel/DayDetailPanel";
import { CalendarSidebar } from "./sidepanel/CalendarSidebar";
import { CalendarWorkspaceToolbar } from "./toolbar/CalendarToolbar";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// 現在時刻フック（DayDetailPanel へ渡す）
// ─────────────────────────────────────────────

const useCurrentTimeMinutes = (): number => {
  const getNow = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  const [minutes, setMinutes] = useState(getNow);

  useEffect(() => {
    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeoutId = window.setTimeout(() => {
      setMinutes(getNow());

      const intervalId = window.setInterval(() => {
        setMinutes(getNow());
      }, 60_000);

      return () => window.clearInterval(intervalId);
    }, msUntilNextMinute);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return minutes;
};

// ─────────────────────────────────────────────
// ビュー選択肢
// ─────────────────────────────────────────────

const VIEW_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "days", label: "Day" },
] as const;

// ─────────────────────────────────────────────
// CalendarPane
// ─────────────────────────────────────────────

export const CalendarPane = ({ onClose: _onClose }: CalendarPaneProps) => {
  const pane = useCalendarPane();
  const currentMinutes = useCurrentTimeMinutes();

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
    toggleGoogleCalendar,
  } = pane;

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
        {/* ── 左サイドバー ── */}
        <CalendarSidebar
          monthDate={sidebarMonthDate}
          selectedDate={selectedDate}
          googleAccounts={googleAccounts}
          isAnyCalendarConnecting={isAnyCalendarConnecting}
          onSelectDate={handleSidebarSelectDate}
          onPreviousMonth={handleSidebarPreviousMonth}
          onNextMonth={handleSidebarNextMonth}
          onAddCalendar={addGoogleCalendar}
          onRemoveAccount={removeGoogleAccount}
          onToggleCalendar={toggleGoogleCalendar}
        />

        {/* ── メインコンテンツ ── */}
        <div
          ref={contentViewportRef}
          className={cn(
            "flex min-w-0 flex-1 flex-col bg-white",
            showDayDetailPanel ? "px-3 pt-4" : "px-5 pt-4",
            activeMode === "task" && "pb-5",
          )}
        >
          {/* ヘッダー */}
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

          {/* ── メイン分岐 ── */}
          {activeMode === "task" ? (
            <CalendarTaskView
              viewMode={selectedViewMode as any}
              anchorDate={currentDate}
              timelineUnitBuffer={{ before: 7, after: 14 }}
              selectedDate={selectedDate}
              dayColumnWidth={C.TIMELINE_DAY_COLUMN_WIDTH}
              rowCount={C.TIMELINE_SKELETON_ROW_COUNT}
              scrollContainerRef={scrollContainerRef}
              onScroll={handleTimelineScroll}
              onSelectDate={handleSidebarSelectDate}
            />
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
              visibleEvents={googleCalendarEvents}
              onSelectDate={handleMonthCellSelectDate}
              onVisibleMonthChange={handleVisibleMonthChange}
            />
          ) : (
            <CalendarWeekDayGrid
              headerScrollRef={headerScrollRef}
              scrollContainerRef={scrollContainerRef}
              visibleDays={visibleDays}
              visibleEvents={googleCalendarEvents}
              calendarDayColumnWidth={calendarDayColumnWidth}
              timelineGridStyle={timelineGridStyle}
              onScroll={handleTimelineScroll}
              selectedDate={selectedDate}
              onSelectDate={handleSidebarSelectDate}
            />
          )}
        </div>

        {/* ── 右サイドパネル（月表示時のみ） ── */}
        {showDayDetailPanel && (
          <DayDetailPanel
            selectedDate={selectedDate}
            events={googleCalendarEvents}
            currentMinutes={currentMinutes}
            onClose={() => setActiveMode("calendar")}
          />
        )}
      </div>
    </div>
  );
};