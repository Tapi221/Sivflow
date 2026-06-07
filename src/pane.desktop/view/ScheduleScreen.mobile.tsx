import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";

const MOBILE_MONTH_VISIBLE_EVENT_COUNT = 3;

const ScheduleScreen = ({ onClose: _onClose, onToggleLeftPanel: _onToggleLeftPanel, isLeftPanelCollapsed: _isLeftPanelCollapsed }: ScheduleScreenProps) => {
  const pane = useScheduleScreen({ allowMultiSelectViewMode: false });

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white" data-testid="mobile-schedule-screen">
      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        <CalendarMonthView currentDate={pane.currentDate} selectedDate={