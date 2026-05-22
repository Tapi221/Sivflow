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
const TOGGLE_TOOLTIP_CLASS_NAME =
  "rounded-lg border border-transparent px-2.5 py-[5px] text-[12px] font-semibold text-white shadow-[0_8px_18px_rgba(25,58,92,0.12)]";
const TOGGLE_ACTIVE_ICON_CLASS_NAME = "text-[#193a5c]";
const TOGGLE_INACTIVE_ICON_CLASS_NAME = "text-[#9aa3b1]";
const TOGGLE_ACTIVE_TOOLTIP_BG_CLASS_NAME = "bg-[#193a5c]";
const TOGGLE_INACTIVE_TOOLTIP_BG_CLASS_NAME = "bg-[#9aa3b1]";

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
          strokeWidth="1.2"
        />
        <rect
          x="8"
          y="1"
          width="5"
          height="12"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.2"
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
          strokeWidth="1.3"
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
    <div className="relative inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-[#f6f8fb] p-0.5">
      {toggleItems.map((item) => {
        const isActive = viewMode === item.value;
        const iconClassName = isActive
          ? TOGGLE_ACTIVE_ICON_CLASS_NAME
          : TOGGLE_INACTIVE_ICON_CLASS_NAME;
        const tooltipBgClassName = isActive
          ? TOGGLE_ACTIVE_TOOLTIP_BG_CLASS_NAME
          : TOGGLE_INACTIVE_TOOLTIP_BG_CLASS_NAME;

        return (
          <HoverTooltip
            key={item.value}
            label={item.label}
            side="top"
            offset={6}
            tooltipClassName={cn(
              TOGGLE_TOOLTIP_CLASS_NAME,
              tooltipBgClassName,
            )}
            arrowClassName={tooltipBgClassName}
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
                isActive
                  ? "text-[#193a5c]"
                  : "text-[#8f929c] hover:text-[#193a5c]",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={TOGGLE_INDICATOR_ID}
                  className="absolute inset-0 -z-10 rounded-lg border border-[#e4eaf1] bg-white"
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
