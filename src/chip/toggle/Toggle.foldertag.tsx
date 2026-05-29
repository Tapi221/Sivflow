import { motion, type Transition } from "framer-motion";
import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { cn } from "@/lib/utils";
import { Tag } from "@/ui/icons";

const TAB_ICON_MAP = {
  folder: ExplorerChromeFolderIcon,
  tag: Tag,
} as const;

const TAB_INDICATOR_ID = "folder-tag-tab-indicator";
const TAB_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

export type FolderTagToggleValue = keyof typeof TAB_ICON_MAP;

export type FolderTagTab = {
  value: FolderTagToggleValue;
  label: string;
  onClick: () => void;
};

type ToggleFolderTagProps = {
  activeMode: FolderTagToggleValue;
  tabs: FolderTagTab[];
};

export const ToggleFolderTag = ({ activeMode, tabs }: ToggleFolderTagProps) => {
  return (
    <div className="relative inline-grid h-8 w-max grid-flow-col items-center gap-1 rounded-xl bg-[#f7f7f7] p-0.5">
      {tabs.map((tab) => {
        const Icon = TAB_ICON_MAP[tab.value];
        const isActive = activeMode === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={tab.onClick}
            aria-label={tab.label}
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
                layoutId={TAB_INDICATOR_ID}
                className="absolute inset-0 -z-10 rounded-lg border border-[#eeeeee] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                transition={TAB_MOTION_TRANSITION}
              />
            )}

            <Icon
              aria-hidden="true"
              className={cn(
                "block h-4 w-4 shrink-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                isActive ? "text-[#8c8c8c]" : "text-[#b7b7b7]",
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
