import { motion } from "framer-motion";

import type { CalendarWorkspaceToolbarProps } from "../schedulePane.types";
import {
  CalendarIcon,
  FieldsToolbarIcon,
  FilterIcon,
  SearchIcon,
  SortToolbarIcon,
  TaskIcon,
  TimelineToolbarIcon,
} from "../../../icons/calendar.icons";
import { useCalendarToolbar } from "./hooks/useScheduleToolbar";

import { cn } from "@/lib/utils";

const TAB_ICON_MAP = {
  calendar: CalendarIcon,
  timeline: TimelineToolbarIcon,
  task: TaskIcon,
} as const;

const ACTION_ICON_MAP = {
  search: SearchIcon,
  filter: FilterIcon,
  sort: SortToolbarIcon,
  fields: FieldsToolbarIcon,
} as const;

const TAB_INDICATOR_ID = "calendar-tab-indicator";

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
    <div className="relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full items-center justify-between overflow-hidden bg-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#e2e4e9] after:content-['']">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* TAB GROUP */}
        <div className="relative flex h-7 items-center gap-[6px]">
          {tabs.map((tab) => {
            const Icon = TAB_ICON_MAP[tab.value];
            const isActive = activeMode === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={tab.onClick}
                className={cn(
                  "relative flex h-7 w-fit items-center gap-[6px] rounded px-2",
                  "appearance-none select-none",
                  "text-[12px] font-medium leading-none transition-colors",

                  // focus completely disabled
                  "outline-none ring-0 shadow-none",
                  "focus:outline-none focus:ring-0 focus:shadow-none",
                  "focus-visible:outline-none",
                  "focus-visible:ring-0",
                  "focus-visible:ring-transparent",
                  "focus-visible:shadow-none",

                  // click behavior
                  "active:bg-transparent",

                  // colors
                  isActive ? "text-[#25272d]" : "text-[#8f929c]",

                  // hover
                  "hover:bg-[#f6f7f9]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span className="whitespace-nowrap">{tab.label}</span>

                {isActive && (
                  <motion.span
                    layoutId={TAB_INDICATOR_ID}
                    className="absolute bottom-[-2px] left-0 right-0 h-[2px] rounded-full bg-black/25"
                  />
                )}
              </button>
            );
          })}
        </div>
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
                "flex h-7 items-center gap-[6px] rounded px-2",
                "appearance-none select-none",
                "text-[12px] font-medium transition-colors",

                // focus completely disabled
                "outline-none ring-0 shadow-none",
                "focus:outline-none focus:ring-0 focus:shadow-none",
                "focus-visible:outline-none",
                "focus-visible:ring-0",
                "focus-visible:ring-transparent",
                "focus-visible:shadow-none",

                // click behavior
                "active:bg-transparent",

                // colors
                "text-[#8f929c]",

                // hover
                "hover:bg-[#f6f7f9] hover:text-[#25272d]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />

              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;
