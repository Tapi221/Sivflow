import type { CSSProperties, RefObject } from "react";

import { cn } from "@/lib/utils";
import { X } from "@/ui/icons";

type TabContextMenuAction = {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
};

type TabContextMenuProps = {
  x: number;
  y: number;
  actions: TabContextMenuAction[];
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
};

export const WORKSPACE_TAB_CONTEXT_MENU_WIDTH = 256;
export const WORKSPACE_TAB_CONTEXT_MENU_HEIGHT = 180;
export const WORKSPACE_TAB_CONTEXT_MENU_MARGIN = 10;

export const WorkspaceTabContextMenu = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
}: TabContextMenuProps) => {
  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="tab menu"
      style={{ ...noDragStyle, left: x, top: y }}
      className={cn(
        "fixed z-[1000] w-[256px] rounded-[10px] border border-black/[0.06] bg-white p-[10px]",
        "font-sans text-[15px] font-normal leading-none text-[#2d2d2d]",
        "shadow-[0_10px_30px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.08)]",
      )}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          role="menuitem"
          disabled={action.disabled}
          className={cn(
            "flex h-[40px] w-full items-center gap-[12px] rounded-[6px] px-[12px] text-left outline-none",
            "transition-[background-color,color] duration-100 ease-out",
            "hover:bg-[#f3f3f3] focus-visible:bg-[#f3f3f3]",
            "disabled:pointer-events-none disabled:text-[#a6a6a6]",
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            action.onSelect();
          }}
        >
          <X
            className={cn(
              "h-4 w-4 shrink-0 text-[#6f6f6f]",
              action.disabled && "text-[#c7c7c7]",
            )}
          />
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </div>
  );
};
