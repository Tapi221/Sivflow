import { motion, useReducedMotion, type Transition } from "framer-motion";

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

const TAB_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
};

const ACTIVE_TAB_INITIAL = {
  opacity: 0,
  y: 7,
  scaleX: 0.96,
};

const ACTIVE_TAB_ANIMATE = {
  opacity: 1,
  y: 0,
  scaleX: 1,
};

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
  const prefersReducedMotion = useReducedMotion();
  const longestLabelLength = Math.max(
    0,
    ...tabs.map((tab) => tab.label.length),
  );
  const tabColumnWidth = `calc(${longestLabelLength}ch + 1.5rem)`;

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
              "outline-none ring-0 transition-[color,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
              "focus:outline-none focus:ring-0 focus-visible:outline-none",
              isActive
                ? "text-[#193a5c]"
                : "text-[#8f929c] hover:text-[#193a5c]",
            )}
          >
            {isActive ? (
              <motion.span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 -z-10 rounded-lg border border-[#e4eaf1] bg-white",
                  "transition-opacity duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                )}
                initial={prefersReducedMotion ? false : ACTIVE_TAB_INITIAL}
                animate={ACTIVE_TAB_ANIMATE}
                transition={
                  prefersReducedMotion ? { duration: 0 } : TAB_MOTION_TRANSITION
                }
                style={{ transformOrigin: "bottom center" }}
              />
            ) : null}

            <Icon
              className={cn(
                "block h-4 w-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
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