import { useCallback, useMemo, useState } from "react";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { SidebarOpenIcon } from "@/components/icons/icons.sidebar";
import * as C from "@/features/calendar/calendar.constants.desktop";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/dropdownchip/ViewModeDropdownChip";
import type { ScheduleScreenProps } from "./scheduleScreen.types";
import { CalendarMonthView } from "./grid/CalendarView.month";
import { CalendarWeekDayGrid } from "./grid/Grid.calendar.weekday.desktop";
import { TaskView } from "./task/TaskView";
import { CalendarTimelineDayView } from "./grid/TimelineDayView";
import { useScheduleScreen } from "./useScheduleScreen";
import { DayDetailPanel } from "./panel/DayDetailPanel";
import { CalendarSidebar } from "./panel/CalendarSidebar";
import { CalendarWorkspaceToolbar } from "./toolbar/ScheduleToolbar";
import { useTaskCalendarEvents } from "./task/hooks/useTaskCalendarEvents";
import { CarvePanel, CarvePanelShell } from "../../components/panel/CarvePanel.desktop";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

const IOS_CALENDAR_SURFACE_CLASS =
  "border-transparent bg-white shadow-none";

const IOS_CALENDAR_MONTH_SURFACE_CLASS =
  "border-transparent bg-[rgba(255,255,255,0.92)] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";

const IOS_CALENDAR_WEEKDAY_SURFACE_CLASS =
  "border-transparent bg-white shadow-none";

const DAY_DETAIL_PANEL_TOGGLE_BUTTON_CLASS =
  "absolute right-4 top-2 z-50 flex h-7 w-8 min-w-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-[#8c8c8c] shadow-none appearance-none select-none outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:text-[#8c8c8c] focus:outline-none focus:ring-0 focus-visible:outline-none motion-reduce:transition-none";

const VIEW_HEADER_CONTROLS_RIGHT_INSET_PX = 56;

export const ScheduleScreen = ({ onClose: _onClose }: ScheduleScreenProps) => {
  const pane = useScheduleScreen();
  const taskCalendarEvents = useTaskCalendarEvents();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const [isDayDetailPanelOpen, setIsDayDetailPanelOpen] = useState(true);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(null);

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
  } = pane;

  const calendarEvents = useMemo(() => {
    return [...googleCalendarEvents, ...taskCalendarEvents];
  }, [googleCalendarEvents, taskCalendarEvents]);

  const sidebarMonthDate =
    selectedViewMode === "month" ? monthTitleDate : titleDate;

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

  const canShowDayDetailPanel =
    activeMode === "calendar" && selectedViewMode === "month";

  const showDayDetailPanel =
    canShowDayDetailPanel && isDayDetailPanelOpen;

  const isDayDetailPanelCollapsed =
    canShowDayDetailPanel && !showDayDetailPanel;

  const isMonthCalendarView =
    activeMode === "calendar" && selectedViewMode === "month";

  const hasTrailingPanel = isMonthCalendarView && !isDayDetailPanelCollapsed;

  const viewHeaderRightPaddingPx = canShowDayDetailPanel
    ? VIEW_HEADER_CONTROLS_RIGHT_INSET_PX
    : 0;

  const dayDetailToggleLabel = showDayDetailPanel
    ? "日詳細パネルを閉じる"
    : "日詳細パネルを開く";

  const handleToggleDayDetailPanel = useCallback(() => {
    if (!canShowDayDetailPanel) return;

    setIsDayDetailPanelOpen((isOpen) => !isOpen);
  }, [canShowDayDetailPanel]);

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

  const renderViewHeader = (className: string) => {
    const headerTitleDate =
      selectedViewMode === "month" ? monthTitleDate : titleDate;

    return (
      <div className={className} style={{ paddingRight: viewHeaderRightPaddingPx }}>
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-[#1c1c1e]">
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
    <CarvePanelShell
      toolbar={(
        <CalendarWorkspaceToolbar
          activeMode={activeMode}
          viewMode={selectedViewMode}
          onSelectCalendar={() => setActiveMode("calendar")}
          onSelectTimeline={() => setActiveMode("timeline")}
          onSelectTask={() => setActiveMode("task")}
          onSelectViewMode={handleSelectViewMode}
        />
      )}
      overlay={
        canShowDayDetailPanel ? (
          <button
            type="button"
            className={DAY_DETAIL_PANEL_TOGGLE_BUTTON_CLASS}
            onClick={handleToggleDayDetailPanel}
            aria-label={dayDetailToggleLabel}
            aria-pressed={showDayDetailPanel}
            aria-expanded={showDayDetailPanel}
          >
            <SidebarOpenIcon className="h-4 w-4 scale-x-[-1] text-[#8c8c8c]" />
          </button>
        ) : null
      }
      leadingPanel={(
        <CalendarSidebar
          monthDate={sidebarMonthDate}
          selectedDate={selectedDate}
          selectedRange={sidebarSelectedRange}
          activeMode={activeMode}
          googleAccounts={googleAccounts}
          isAnyCalendarConnecting={isAnyCalendarConnecting}
          selectedTaskListId={selectedTaskListId}
          onSelectDate={handleSidebarSelectDateAndOpen}
          onPreviousMonth={handleSidebarPreviousMonth}
          onNextMonth={handleSidebarNextMonth}
          onAddCalendar={addGoogleCalendar}
          onReconnectAccount={(accountId) => {
            void reconnectGoogleAccount(accountId);
          }}
          onToggleCalendar={toggleGoogleCalendar}
          onSelectTaskList={setSelectedTaskListId}
        />
      )}
      trailingPanel={
        canShowDayDetailPanel ? (
          <DayDetailPanel
            selectedDate={selectedDate}
            events={calendarEvents}
            isOpen={showDayDetailPanel}
          />
        ) : null
      }
      hasTrailingPanel={hasTrailingPanel}
      viewportRef={contentViewportRef}
    >
      {activeMode === "task" ? (
        <CarvePanel>
          <TaskView
            googleAccounts={googleAccounts}
            selectedTaskListId={selectedTaskListId}
            onSelectTaskList={setSelectedTaskListId}
          />
        </CarvePanel>
      ) : isMonthCalendarView ? (
        <CarvePanel hasTrailingPanel={hasTrailingPanel}>
          {renderViewHeader(
            "mb-2 flex shrink-0 items-center justify-between px-5 pt-4",
          )}

          <div
            className={cn(
              "ml-4 flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0",
              IOS_CALENDAR_MONTH_SURFACE_CLASS,
              isDayDetailPanelCollapsed
                ? "mr-0 rounded-tl-[22px] rounded-tr-none border-r-0"
                : "mr-4 rounded-t-[22px]",
            )}
          >
            <CalendarMonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              scrollTargetToken={monthScrollTargetToken}
              visibleEvents={calendarEvents}
              onSelectDate={handleMonthCellSelectDateAndOpen}
              onVisibleMonthChange={handleVisibleMonthChange}
              onRenderedRangeChange={handleMonthRenderedRangeChange}
            />
          </div>
        </CarvePanel>
      ) : (
        <CarvePanel>
          {renderViewHeader(
            "mb-2 flex shrink-0 items-center justify-between px-5 pt-4",
          )}

          <div
            className={cn(
              "ml-4 mr-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-[22px] rounded-tr-none border-0",
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
                laneLabelWidth={C.TIMELINE_LANE_LABEL_WIDTH}
                rowCount={C.TIMELINE_SKELETON_ROW_COUNT}
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
      )}
    </CarvePanelShell>
  );
};