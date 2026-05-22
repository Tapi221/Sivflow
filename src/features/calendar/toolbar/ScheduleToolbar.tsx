import type { CalendarWorkspaceToolbarProps } from "../schedulePane.types";
import {
  FieldsToolbarIcon,
  FilterIcon,
  SearchIcon,
  SortToolbarIcon,
} from "../../../components/icons/schedule.icons";
import { ToggleCalendarTimelineTask } from "../chip/toggle/Toggle.calendartimelinetask";
import { useCalendarToolbar } from "./hooks/useScheduleToolbar";

import { cn } from "@/lib/utils";

const ACTION_ICON_MAP = {
  search: SearchIcon,
  filter: FilterIcon,
  sort: SortToolbarIcon,
  fields: FieldsToolbarIcon,
} as const;

const toolbarIconClassName =
  "h-[17px] w-[17px] shrink-0 text-current transition-transform duration-200 ease-out group-hover/action:scale-[1.06] group-focus-visible/action:scale-[1.06] motion-reduce:transition-none";

const toolbarTooltipClassName =
  "pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full border border-[#d1d1d6]/70 bg-white/95 px-2.5 py-1 text-[11px] font-medium leading-none tracking-[-0.01em] text-[#3c3c43]/72 opacity-0 shadow-[0_8px_18px_rgba(60,60,67,0.12)] backdrop-blur-xl transition-all duration-150 ease-out group-hover/action:translate-y-0 group-hover/action:opacity-100 group-focus-visible/action:translate-y-0 group-focus-visible/action:opacity-100 motion-reduce:transition-none";

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
    <div className="flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between overflow-visible bg-white pr-[var(--workspace-content-gutter)]">
      <div className="flex items-center gap-3">
        <ToggleCalendarTimelineTask activeMode={activeMode} tabs={tabs} />
      </div>

      <div className="relative z-10 flex h-10 shrink-0 items-center justify-end gap-1 rounded-full bg-[#f2f2f7]/80 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_0_0_0.5px_rgba(60,60,67,0.12)] backdrop-blur-xl">
        {actions.map((action) => {
          const Icon = ACTION_ICON_MAP[action.key];

          return (
            <button
              key={action.key}
              type="button"
              aria-label={action.label}
              className={cn(
                "group/action relative flex h-8 w-8 items-center justify-center rounded-full",
                "text-[#3c3c43]/65 transition-[background-color,color,box-shadow] duration-150 ease-out",
                "hover:bg-white/95 hover:text-[#007aff] hover:shadow-[0_1px_4px_rgba(0,0,0,0.1)]",
                "active:bg-white active:text-[#0066d6] motion-reduce:transition-none",
                "focus-visible:bg-white focus-visible:text-[#007aff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/25",
              )}
            >
              <Icon className={toolbarIconClassName} />
              <span className={toolbarTooltipClassName}>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;
