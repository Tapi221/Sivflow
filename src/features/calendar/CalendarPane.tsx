import { ChevronLeft, ChevronRight } from "@/ui/icons";

import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarTimelineDayView } from "./TimelineDayView";
import { CalendarSidebar } from "./CalendarSidebar";
import { CalendarWeekDayGrid } from "./CalendarWeekDayGrid";
import { CalendarWorkspaceToolbar } from "./CalendarToolbar";
import { useCalendarPane } from "./hooks/useCalendarPane";
import { SidebarPanelIcon } from "./calendar.icons";
import type { CalendarPaneProps } from "./calendarPane.types";
import * as C from "@/features/calendar/calendar.constants.desktop";

export const CalendarPane = ({ onClose: _onClose }: CalendarPaneProps) => {
  const pane = useCalendarPane();

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <CalendarWorkspaceToolbar
        activeMode={pane.activeMode}
        viewMode={pane.selectedViewMode}
        onSelectCalendar={() => {
          pane.setActiveMode("calendar");
          pane.setIsCalendarSidebarOpen(true);
        }}
        onSelectTimeline={() => {
          pane.setActiveMode("timeline");
          pane.setIsCalendarSidebarOpen(false);
        }}
        onSelectViewMode={pane.handleSelectViewMode}
      />

      <div className="flex min-h-0 flex-1 bg-white">
        {pane.isCalendarSidebarOpen ? (
          <CalendarSidebar
            monthDate={pane.currentDate}
            selectedDate={pane.selectedDate}
            calendars={pane.googleCalendars}
            googleAccountEmail={pane.googleAccountEmail}
            selectedCalendarIds={pane.selectedCalendarIds}
            calendarError={pane.googleCalendarError}
            isCalendarConnected={pane.isGoogleCalendarConnected}
            isCalendarConnecting={pane.isGoogleCalendarConnecting}
            onSelectDate={pane.handleSidebarSelectDate}
            onPreviousMonth={pane.handleSidebarPreviousMonth}
            onNextMonth={pane.handleSidebarNextMonth}
            onClose={() => pane.setIsCalendarSidebarOpen(false)}
            onConnectCalendar={pane.connectGoogleCalendar}
            onToggleCalendar={pane.toggleGoogleCalendar}
          />
        ) : null}

        <div
          ref={pane.contentViewportRef}
          className="flex min-w-0 flex-1 flex-col bg-white px-5 pb-5 pt-4"
        >
          {/* ── ナビゲーションヘッダー ── */}
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {!pane.isCalendarSidebarOpen ? (
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dde2ea] bg-white text-[#667085] transition-colors hover:bg-[#f8fafc] hover:text-[#20242c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => pane.setIsCalendarSidebarOpen(true)}
                  aria-label="Show calendar sidebar"
                  title="Show calendar sidebar"
                >
                  <SidebarPanelIcon className="h-4 w-4" />
                </button>
              ) : null}

              {pane.monthLabel ? (
                <h1 className="truncate text-[16px] font-semibold text-[#24272f]">
                  {pane.monthLabel}
                </h1>
              ) : (
                <div aria-hidden="true" className="h-6 w-24" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dde2ea] bg-white text-[#667085] transition-colors hover:bg-[#f8fafc]"
                onClick={pane.handlePrevious}
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#dde2ea] bg-white px-4 py-[7px] text-[14px] font-semibold text-[#20242c] transition-colors hover:bg-[#f8fafc]"
                onClick={pane.handleToday}
              >
                Today
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dde2ea] bg-white text-[#667085] transition-colors hover:bg-[#f8fafc]"
                onClick={pane.handleNext}
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── メインビュー切り替え ── */}
          {pane.activeMode === "timeline" ? (
            <CalendarTimelineDayView
              viewMode={pane.selectedViewMode}
              anchorDate={pane.currentDate}
              timelineUnitBuffer={{ before: 7, after: 14 }}
              selectedDate={pane.currentDate}
              dayColumnWidth={C.TIMELINE_DAY_COLUMN_WIDTH}
              laneLabelWidth={C.TIMELINE_LANE_LABEL_WIDTH}
              rowCount={C.TIMELINE_SKELETON_ROW_COUNT}
              scrollContainerRef={pane.scrollContainerRef}
              onScroll={pane.handleTimelineScroll}
              onSelectDate={pane.handleSidebarSelectDate}
            />
          ) : pane.selectedViewMode === "month" ? (
            <CalendarMonthView
              currentDate={pane.currentDate}
              selectedDate={pane.selectedDate}
              scrollTargetToken={pane.monthScrollTargetToken}
              visibleEvents={pane.googleCalendarEvents}
              onSelectDate={pane.handleSidebarSelectDate}
              onVisibleMonthChange={pane.handleVisibleMonthChange}
            />
          ) : (
            <CalendarWeekDayGrid
              headerScrollRef={pane.headerScrollRef}
              scrollContainerRef={pane.scrollContainerRef}
              visibleDays={pane.visibleDays}
              visibleEvents={pane.googleCalendarEvents}
              calendarDayColumnWidth={pane.calendarDayColumnWidth}
              timelineGridStyle={pane.timelineGridStyle}
              onScroll={pane.handleTimelineScroll}
            />
          )}
        </div>
      </div>
    </div>
  );
};
