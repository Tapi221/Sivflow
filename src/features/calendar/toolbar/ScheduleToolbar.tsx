import type { CalendarWorkspaceToolbarProps } from "../scheduleScreen.types";
import { ToggleCalendarTimelineTask } from "../../../chip/toggle/Toggle.calendartimelinetask";
import { useCalendarToolbar } from "./hooks/useScheduleToolbar";
import { TaskTagStrip } from "./TaskTagStrip";

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
    <div className="calendar-workspace-toolbar flex w-full shrink-0 flex-col overflow-visible bg-white pr-[var(--workspace-content-gutter)]">
      <div className="flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <ToggleCalendarTimelineTask activeMode={activeMode} tabs={tabs} />
        </div>
      </div>

      {activeMode === "task" && <TaskTagStrip />}
    </div>
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;
