import type { CalendarWorkspaceToolbarProps } from "../schedulePane.types";
import {
  FieldsToolbarIcon,
  FilterIcon,
  SearchIcon,
  SortToolbarIcon,
} from "../../../components/icons/schedule.icons";
import { ToggleCalendarTimelineTask } from "../chip/Toggle.calendartimelinetask";
import { useCalendarToolbar } from "./hooks/useScheduleToolbar";

import { cn } from "@/lib/utils";

const ACTION_ICON_MAP = {
  search: SearchIcon,
  filter: FilterIcon,
  sort: SortToolbarIcon,
  fields: FieldsToolbarIcon,
} as const;

export const CalendarToolbar = ({
  activeMode,
  onSelectCalendar,
  onSelectTimeline,
  onSelectTask,
}: CalendarWorkspaceToolbarProps) => {
  const { tabs, actions } = useCalendarToolbar({
    onSelectCalendar,
    onSelectTimeline,
    onSelectTask,
  });

  return (
    <div className="flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between overflow-hidden bg-white">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <ToggleCalendarTimelineTask activeMode={activeMode} tabs={tabs} />
      </div>

      {/* RIGHT ACTIONS */}
      <div className="flex h-7 items-center gap-[6px]">
        {actions.map((action) => {
          const Icon = ACTION_ICON_MAP[action.key];

          return (
            <button
              key={action.key}
              type="button"
              className={cn(
                "flex h-7 min-h-0 min-w-0 items-center gap-[6px] rounded px-2",
                "appearance-none select-none",
                "text-[12px] font-medium leading-none transition-colors",
                "outline-none ring-0 shadow-none",
                "focus:outline-none focus:ring-0 focus:shadow-none",
                "focus-visible:outline-none",
                "focus-visible:ring-0",
                "focus-visible:ring-transparent",
                "focus-visible:shadow-none",
                "active:bg-transparent",
                "text-[#8f929c]",
                "hover:bg-[#f6f7f9] hover:text-[#193a5c]",
              )}
            >
              <Icon className="block h-4 w-4 shrink-0" />

              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;