import type { CalendarWorkspaceToolbarProps } from "@/features/calendar/scheduleScreen.types";

export const CalendarToolbar = ({
  viewMode: _viewMode,
  onSelectViewMode: _onSelectViewMode,
}: CalendarWorkspaceToolbarProps) => {
  return (
    <div className="calendar-workspace-toolbar h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 bg-white" />
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;
