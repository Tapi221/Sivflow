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

export const WORKSPACE_TAB_CONTEXT_MENU_WIDTH = 228;
export const WORKSPACE_TAB_CONTEXT_MENU_HEIGHT = 156;
export const WORKSPACE_TAB_CONTEXT_MENU_MARGIN = 8;

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
        "fixed z-[1000] w-max min-w-[148px] max-w-[228px] rounded-[9px] border border-black/[0.06] bg-white p-1.5",
        "font-sans text-[15px] font-normal leading-[20px] text-[#2c2c2c]",
        "shadow-[0_8px_20px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.08)]",
      )}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          role="menuitem"
          disabled={action.disabled}
          className={cn(
            "flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left outline-none",
            "transition-[background-color,color] duration-100 ease-out",
            "hover:bg-[#f3f3f3] focus-visible:bg-[#f3f3f3]",
            "disabled:pointer-events-none disabled:text-[#a7a7a7]",
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            action.onSelect();
          }}
        >
          <X
            className={cn(
              "h-[15px] w-[15px] shrink-0 text-[#6f6f6f]",
              action.disabled && "text-[#c7c7c7]",
            )}
          />
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </div>
  );
};
