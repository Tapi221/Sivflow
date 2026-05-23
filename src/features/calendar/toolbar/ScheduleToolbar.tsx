import type { CalendarWorkspaceToolbarProps } from "../schedulePane.types";
import { ToggleCalendarTimelineTask } from "../../../chip/toggle/Toggle.calendartimelinetask";
import { useCalendarToolbar } from "./hooks/useScheduleToolbar";

export const CalendarToolbar = ({
  activeMode,
  onSelectCalendar,
  onSelectTimeline,
  onSelectTask,
}: CalendarWorkspaceToolbarProps) => {
  const { tabs } = useCalendarToolbar({
    onSelectCalendar,
    onSelectTimeline,
    onSelectTask,
  });

  return (
    <div className="flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between overflow-visible bg-white pr-[var(--workspace-content-gutter)]">
      <div className="flex items-center gap-3">
        <ToggleCalendarTimelineTask activeMode={activeMode} tabs={tabs} />
      </div>
    </div>
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;
