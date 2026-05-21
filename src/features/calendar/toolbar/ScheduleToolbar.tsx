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
} from "../../../components/icons/schedule.icons";
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
    <div className="relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between overflow-hidden bg-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#edf0f4] after:content-['']">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* TAB GROUP */}
        <div className="relative flex h-8 items-center gap-1 rounded-xl bg-[#f6f8fb] p-0.5">
          {tabs.map((tab) => {
            const Icon = TAB_ICON_MAP[tab.value];
            const isActive = activeMode === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={tab.onClick}
                className={cn(
                  "relative z-10 flex h-7 min-w-0 items-center gap-1.5 rounded-lg px-2.5",
                  "appearance-none select-none",
                  "text-[12px] font-medium leading-none",
                  "outline-none ring-0 transition-colors duration-200",
                  "focus:outline-none focus:ring-0 focus-visible:outline-none",
                  isActive
                    ? "text-[#193a5c]"
                    : "text-[#8f929c] hover:text-[#193a5c]",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId={TAB_INDICATOR_ID}
                    className="absolute inset-0 -z-10 rounded-lg border border-[#e4eaf1] bg-white"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                    }}
                  />
                )}

                <Icon
                  className={cn(
                    "block h-4 w-4 shrink-0 transition-colors duration-200",
                    isActive ? "text-[#193a5c]" : "text-[#9aa3b1]",
                  )}
                />

                <span className="whitespace-nowrap">{tab.label}</span>
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