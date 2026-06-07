import { CalendarMonthView } from "@/features/calendar/grid/CalendarView.month";
import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";

const MOBILE_MONTH_VISIBLE_EVENT_COUNT = 3;

const ScheduleScreen = ({ onClose: _onClose, onToggleLeftPanel: _onToggleLeftPanel, isLeftPanelCollapsed: _isLeftPanelCollapsed }: ScheduleScreenProps) => {
  const pane = useSchedule