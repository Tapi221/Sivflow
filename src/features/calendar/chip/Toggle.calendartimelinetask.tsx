import { motion } from "framer-motion";

import type { CalendarWorkspaceToolbarProps } from "../schedulePane.types";
import {
  CalendarIcon,
  TaskIcon,
  TimelineToolbarIcon,
} from "../../../components/icons/schedule.icons";

import { cn } from "@/lib/utils";

const TAB_ICON_MAP = {
  calendar: CalendarIcon,
  timeline: TimelineToolbarIcon,
  task: TaskIcon,
} as const;

const TAB_INDICATOR_ID = "calendar-tab-indicator";

type CalendarTimelineTaskTab = {
  value: CalendarWorkspaceToolbarProps["activeMode"];
  label: string;
  onClick: () => void;
};

type ToggleCalendarTimelineTaskProps = {
  activeMode: CalendarWorkspaceToolbarProps["activeMode"];
  tabs: CalendarTimelineTaskTab[];
};

export const ToggleCalendarTimelineTask = ({
  activeMode,
  tabs,
}: ToggleCalendarTimelineTaskProps) => {
  const longestLabelLength = Math.max(
    0,
    ...tabs.map((tab) => tab.label.length),
  );
  const tabColumnWidth = `calc(${longestLabelLength}ch + 2.25rem)`;

  return (
    <div
      className="relative inline-grid h-8 w-max items-center gap-1 rounded-xl bg-[#f6f8fb] p-0.5"
      style={{
        gridTemplateColumns: `repeat(${tabs.length}, ${tabColumnWidth})`,
      }}
    >
      {tabs.map((tab) => {
        const Icon = TAB_ICON_MAP[tab.value];
        const isActive = activeMode === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={tab.onClick}
            className={cn(
              "relative z-10 flex h-7 w-full min-w-0 items-center justify-center gap-1.5 rounded-lg px-2",
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
  );
};