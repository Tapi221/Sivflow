import { motion, type Transition } from "framer-motion";

import { HoverTooltip } from "@/components/toolchip/HoverTooltip";

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
const TAB_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

const TAB_TOOLTIP_CLASS_NAME =
  "rounded-lg border border-[#e4eaf1] bg-white px-2.5 py-[5px] text-[12px] font-semibold text-[#193a5c] shadow-[0_8px_18px_rgba(25,58,92,0.12)]";
const TAB_TOOLTIP_ARROW_CLASS_NAME =
  "border-b border-r border-[#e4eaf1] bg-white";

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
  return (
    <div className="relative inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-[#f6f8fb] p-0.5">
      {tabs.map((tab) => {
        const Icon = TAB_ICON_MAP[tab.value];
        const isActive = activeMode === tab.value;

        return (
          <HoverTooltip
            key={tab.value}
            label={tab.label}
            side="top"
            offset={6}
            tooltipClassName={TAB_TOOLTIP_CLASS_NAME}
            arrowClassName={TAB_TOOLTIP_ARROW_CLASS_NAME}
          >
            <button
              type="button"
              onClick={tab.onClick}
              aria-label={tab.label}
              className={cn(
                "relative z-10 flex h-7 w-8 min-w-0 items-center justify-center rounded-lg p-0",
                "appearance-none select-none",
                "outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
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
                  transition={TAB_MOTION_TRANSITION}
                />
              )}

              <Icon
                aria-hidden="true"
                className={cn(
                  "block h-4 w-4 shrink-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                  isActive ? "text-[#193a5c]" : "text-[#9aa3b1]",
                )}
              />
            </button>
          </HoverTooltip>
        );
      })}
    </div>
  );
};