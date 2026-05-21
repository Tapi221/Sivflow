import { motion, type Transition } from "framer-motion";

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

const toggleItems = [
  {
    value: "board",
    label: "Board",
    icon: (
      <svg viewBox="0 0 14 14" fill="none" className="block h-4 w-4">
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
      <svg viewBox="0 0 14 14" fill="none" className="block h-4 w-4">
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
  const longestLabelLength = Math.max(
    0,
    ...toggleItems.map((item) => item.label.length),
  );
  const itemColumnWidth = `calc(${longestLabelLength}ch + 1.5rem)`;

  return (
    <div
      className="relative inline-grid h-8 w-max items-center gap-1 rounded-xl bg-[#f6f8fb] p-0.5"
      style={{
        gridTemplateColumns: `repeat(${toggleItems.length}, ${itemColumnWidth})`,
      }}
    >
      {toggleItems.map((item) => {
        const isActive = viewMode === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "relative z-10 flex h-7 w-full min-w-0 items-center justify-center gap-1.5 rounded-lg px-2",
              "appearance-none select-none",
              "text-[12px] font-medium leading-none",
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
                isActive ? "text-[#193a5c]" : "text-[#9aa3b1]",
              )}
            >
              {item.icon}
            </span>

            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};