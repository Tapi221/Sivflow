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
const TOGGLE_ICON_STROKE_WIDTH = 1.65;

const toggleItems = [
  {
    value: "board",
    label: "Board",
    icon: (
      <svg
        viewBox="0 0 18 18"
        fill="none"
        className="block h-[17px] w-[17px]"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3.25"
          width="5"
          height="11.5"
          rx="1.75"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth={TOGGLE_ICON_STROKE_WIDTH}
        />
        <rect
          x="10"
          y="3.25"
          width="5"
          height="11.5"
          rx="1.75"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth={TOGGLE_ICON_STROKE_WIDTH}
        />
        <path
          d="M5.05 5.45h.9M12.05 5.45h.9"
          stroke="currentColor"
          strokeWidth={1.35}
          strokeLinecap="round"
          opacity="0.58"
        />
      </svg>
    ),
  },
  {
    value: "list",
    label: "List",
    icon: (
      <svg
        viewBox="0 0 18 18"
        fill="none"
        className="block h-[17px] w-[17px]"
        aria-hidden="true"
      >
        <path
          d="M7.1 5h7.4M7.1 9h7.4M7.1 13h7.4"
          stroke="currentColor"
          strokeWidth={TOGGLE_ICON_STROKE_WIDTH}
          strokeLinecap="round"
        />
        <path
          d="M3.75 5h.01M3.75 9h.01M3.75 13h.01"
          stroke="currentColor"
          strokeWidth={2.4}
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
