import { motion, type Transition } from "framer-motion";
import type { CalendarViewMode } from "@/features/calendar/calendar.types";
import { cn } from "@/lib/utils";

type CalendarViewModeOption = {
  value: CalendarViewMode;
  label: string;
};

type ToggleCalendarViewModeProps = {
  value: CalendarViewMode;
  onChange: (value: CalendarViewMode) => void;
  options: readonly CalendarViewModeOption[];
  className?: string;
};

const CALENDAR_VIEW_MODE_INDICATOR_ID = "calendar-view-mode-indicator";
const CALENDAR_VIEW_MODE_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

const renderListPlaceholderButton = () => (
  <button
    type="button"
    aria-disabled="true"
    className={cn(
      "relative z-10 flex h-6 min-w-7 cursor-default items-center justify-center rounded-[8px] px-1.5",
      "appearance-none select-none text-[11px] font-semibold leading-none tracking-[-0.01em]",
      "text-[#b3b3b3] outline-none ring-0",
      "focus:outline-none focus:ring-0 focus-visible:outline-none",
    )}
  >
    <span className="relative z-10">リスト</span>
  </button>
);

export const ToggleCalendarViewMode = ({
  value,
  onChange,
  options,
  className,
}: ToggleCalendarViewModeProps) => {
  return (
    <div
      role="group"
      aria-label="表示形式"
      className={cn(
        "relative inline-grid h-7 w-max grid-flow-col items-center gap-1 rounded-[10px] bg-[#f7f7f7] p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <>
            {option.value === "pieChart" && renderListPlaceholderButton()}
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative z-10 flex h-6 min-w-7 items-center justify-center rounded-[8px] px-1.5",
                "appearance-none select-none text-[11px] font-semibold leading-none tracking-[-0.01em]",
                "outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                "focus:outline-none focus:ring-0 focus-visible:outline-none",
                isActive ? "text-[#8c8c8c]" : "text-[#b3b3b3] hover:text-[#8c8c8c]",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={CALENDAR_VIEW_MODE_INDICATOR_ID}
                  className="absolute inset-0 -z-10 rounded-[8px] border border-[#eeeeee] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  transition={CALENDAR_VIEW_MODE_MOTION_TRANSITION}
                />
              )}
              <span className="relative z-10">{option.label}</span>
            </button>
          </>
        );
      })}
    </div>
  );
};

export const ViewModeDropdown = ToggleCalendarViewMode;
