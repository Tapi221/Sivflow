import { motion, type Transition } from "framer-motion";

import { HoverTooltip } from "@/components/toolchip/HoverTooltip";
import { cn } from "@/lib/utils";

export type BoardListViewMode = "board" | "list";

type BoardListToggleButtonProps = {
  viewMode: BoardListViewMode;
  onChange: (viewMode: BoardListViewMode) => void;
};

const TOGGLE_INDICATOR_ID = "board-list-toggle-indicator";
const TOGGLE_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};
const TOGGLE_ACTIVE_ICON_CLASS_NAME = "text-[#8c8c8c]";
const TOGGLE_INACTIVE_ICON_CLASS_NAME = "text-[#b7b7b7]";

const toggleItems = [
  {
    value: "board",
    label: "Board",
    icon: (
      <svg
        viewBox="0 0 14 14"
        fill="none"
        className="block h-4 w-4"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="5"
          height="12"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="8"
          y="1"
          width="5"
          height="12"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    value: "list",
    label: "List",
    icon: (
      <svg
        viewBox="0 0 14 14"
        fill="none"
        className="block h-4 w-4"
        aria-hidden="true"
      >
        <path
          d="M1.5 3.5h11M1.5 7h11M1.5 10.5h11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

export const BoardListToggleButton = ({
  viewMode,
  onChange,
}: BoardListToggleButtonProps) => {
  return (
    <div className="relative inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-[#f7f7f7] p-0.5">
      {toggleItems.map((item) => {
        const isActive = viewMode === item.value;
        const iconClassName = isActive
          ? TOGGLE_ACTIVE_ICON_CLASS_NAME
          : TOGGLE_INACTIVE_ICON_CLASS_NAME;

        return (
          <HoverTooltip
            key={item.value}
            label={item.label}
            side="top"
            offset={6}
            preset="segmented"
          >
            <button
              type="button"
              onClick={() => onChange(item.value)}
              aria-label={item.label}
              className={cn(
                "relative z-10 flex h-7 w-8 min-w-0 items-center justify-center rounded-lg p-0",
                "appearance-none select-none",
                "outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                "focus:outline-none focus:ring-0 focus-visible:outline-none",
                isActive ? "text-[#8c8c8c]" : "text-[#b3b3b3] hover:text-[#8c8c8c]",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={TOGGLE_INDICATOR_ID}
                  className="absolute inset-0 -z-10 rounded-lg border border-[#eeeeee] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  transition={TOGGLE_MOTION_TRANSITION}
                />
              )}

              <span
                className={cn(
                  "shrink-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                  iconClassName,
                )}
              >
                {item.icon}
              </span>
            </button>
          </HoverTooltip>
        );
      })}
    </div>
  );
};
