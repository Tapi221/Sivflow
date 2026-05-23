import { motion, type Transition } from "framer-motion";

import type { CalendarViewMode } from "@/features/calendar/calendar.types";
import { cn } from "@/lib/utils";

type ViewModeDropdownOption = {
  value: CalendarViewMode;
  label: string;
};

type ViewModeDropdownProps = {
  value: CalendarViewMode;
  onChange: (value: CalendarViewMode) => void;
  options: readonly ViewModeDropdownOption[];
  className?: string;
};

const VIEW_MODE_INDICATOR_ID = "calendar-view-mode-indicator";
const VIEW_MODE_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

export const ViewModeDropdown = ({
  value,
  onChange,
  options,
  className,
}: ViewModeDropdownProps) => {
  return (
    <div
      role="group"
      aria-label="表示形式"
      className={cn(
        "relative inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-[#f7f7f7] p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex h-7 min-w-8 items-center justify-center rounded-lg px-2",
              "appearance-none select-none text-[12px] font-semibold leading-none tracking-[-0.01em]",
              "outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
              "focus:outline-none focus:ring-0 focus-visible:outline-none",
              isActive ? "text-[#8c8c8c]" : "text-[#b3b3b3] hover:text-[#8c8c8c]",
            )}
          >
            {isActive && (
              <motion.span
                layoutId={VIEW_MODE_INDICATOR_ID}
                className="absolute inset-0 -z-10 rounded-lg border border-[#eeeeee] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                transition={VIEW_MODE_MOTION_TRANSITION}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
