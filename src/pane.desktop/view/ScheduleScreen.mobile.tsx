import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";

const MOBILE_MONTH_VISIBLE_EVENT_COUNT = 3;

const ScheduleScreen = ({ onClose: _onClose, onToggleLeftPanel: _onToggleLeftPanel, isLeftPanelCollapsed: _isLeftPanelCollapsed }: ScheduleScreenProps) => {
  const pane = useScheduleScreen({ allowMultiSelectViewMode: false });

  return (
    <div className="h-full min-h-0 w-full bg-white" data-testid="mobile-schedule-screen">
      <CalendarMonthView
        currentDate={pane.currentDate}
        selectedDate={pane.selectedDate}
        scrollTargetToken={pane.monthScrollTargetToken}
        visibleEvents={pane.googleCalendarEvents}
        showEventTimeLabel={false}
        monthVisibleEventCount={MOBILE_MONTH_VISIBLE_EVENT_COUNT}
        onSelectDate={pane.handleMonthCellSelectDate}
        onVisibleMonthChange={pane.handleVisibleMonthChange}
        onRenderedRangeChange={pane.handleMonthRenderedRangeChange}
      />
    </div>
  );
};

export { ScheduleScreen };