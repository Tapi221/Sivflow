import { ChevronLeft, ChevronRight, ChevronDown, Check } from "@/ui/icons";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  MonthViewIcon,
  WeekViewIcon,
  DayViewIcon,
} from "@/features/calendar/ui/calendar.icons";

import { CalendarMonthView } from "./grid/CalendarView.month";
import { CalendarTimelineDayView } from "./grid/TimelineDayView";
import { CalendarSidebar } from "./sidepanel/CalendarSidebar";
import { CalendarWeekDayGrid } from "./grid/Grid.calendar.weekday.desktop";
import { CalendarWorkspaceToolbar } from "./toolbar/CalendarToolbar";
import { useCalendarPane } from "./hooks/useCalendarPane";
import type { CalendarPaneProps } from "./calendarPane.types";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { cn } from "@/lib/utils";

const VIEW_OPTIONS = [
  { value: "month", label: "Month", Icon: MonthViewIcon },
  { value: "week", label: "Week", Icon: WeekViewIcon },
  { value: "days", label: "Day", Icon: DayViewIcon },
] as const;

const VIEW_LABEL_MAP = {
  month: "Month",
  week: "Week",
  days: "Day",
} as const;

export const CalendarPane = ({ onClose: _onClose }: CalendarPaneProps) => {
  const pane = useCalendarPane();

  const {
    activeMode,
    selectedViewMode,
    currentDate,
    selectedDate,
    monthLabel,
    titleDate,
    monthScrollTargetToken,
    visibleDays,
    googleCalendarEvents,
    googleCalendars,
    googleAccountEmail,
    selectedCalendarIds,
    googleCalendarError,
    isGoogleCalendarConnected,
    isGoogleCalendarConnecting,
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
    connectGoogleCalendar,
    toggleGoogleCalendar,
  } = pane;

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
          monthDate={titleDate}
          selectedDate={selectedDate}
          calendars={googleCalendars}
          googleAccountEmail={googleAccountEmail}
          selectedCalendarIds={selectedCalendarIds}
          calendarError={googleCalendarError}
          isCalendarConnected={isGoogleCalendarConnected}
          isCalendarConnecting={isGoogleCalendarConnecting}
          onSelectDate={handleSidebarSelectDate}
          onPreviousMonth={handleSidebarPreviousMonth}
          onNextMonth={handleSidebarNextMonth}
          onConnectCalendar={connectGoogleCalendar}
          onToggleCalendar={toggleGoogleCalendar}
        />

        <div
          ref={contentViewportRef}
          className={cn(
            "flex min-w-0 flex-1 flex-col bg-white px-5 pt-4",
            activeMode === "task" && "pb-5",
          )}
        >
          {activeMode !== "task" && (
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {monthLabel ? (
                  <h1 className="truncate text-[16px] font-semibold text-[#24272f]">
                    {monthLabel}
                  </h1>
                ) : (
                  <div aria-hidden="true" className="h-6 w-24" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-[#e2e4e9] bg-white px-3 text-[13px] font-medium text-[#25272d] transition-colors hover:bg-[#f5f6f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {(() => {
                        const opt = VIEW_OPTIONS.find(
                          (o) => o.value === selectedViewMode,
                        );
                        if (!opt) return null;
                        const { Icon } = opt;
                        return (
                          <>
                            <Icon className="h-3.5 w-3.5 shrink-0 text-[#8f929c]" />
                            <span>{VIEW_LABEL_MAP[selectedViewMode]}</span>
                          </>
                        );
                      })()}
                      <ChevronDown className="h-3 w-3 shrink-0 text-[#8f929c]" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={4}
                      className="z-50 min-w-[150px] overflow-hidden rounded-lg border border-[#e2e4e9] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
                    >
                      <div className="px-3 py-1.5 text-[11px] font-medium text-[#a0a4b0]">
                        Views:
                      </div>

                      {VIEW_OPTIONS.map(({ value, label, Icon }) => (
                        <DropdownMenu.Item
                          key={value}
                          onSelect={() => handleSelectViewMode(value)}
                          className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-[13px] text-[#24272f] outline-none data-[highlighted]:bg-[#f5f6f8]"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0 text-[#8f929c]" />
                            <span
                              className={
                                selectedViewMode === value ? "font-medium" : ""
                              }
                            >
                              {label}
                            </span>
                          </div>
                          {selectedViewMode === value && (
                            <Check className="h-4 w-4 shrink-0 text-[#25272d]" />
                          )}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                <div className="flex items-center overflow-hidden rounded-lg border border-[#e2e4e9] bg-white">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center border-r border-[#e2e4e9] text-[#8f929c] transition-colors hover:bg-[#f5f6f8] hover:text-[#20242c]"
                    onClick={handlePrevious}
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    className="px-3 py-[7px] text-[13px] font-medium text-[#20242c] transition-colors hover:bg-[#f5f6f8]"
                    onClick={handleToday}
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center border-l border-[#e2e4e9] text-[#8f929c] transition-colors hover:bg-[#f5f6f8] hover:text-[#20242c]"
                    onClick={handleNext}
                    aria-label="Next"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeMode === "task" ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-[14px] text-[#8f929c]">
              Task view coming soon
            </div>
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
              onSelectDate={handleSidebarSelectDate}
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
            />
          )}
        </div>
      </div>
    </div>
  );
};