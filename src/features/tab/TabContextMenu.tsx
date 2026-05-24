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

export const WORKSPACE_TAB_CONTEXT_MENU_WIDTH = 216;
export const WORKSPACE_TAB_CONTEXT_MENU_HEIGHT = 164;
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
      aria-label="タブメニュー"
      style={{ ...noDragStyle, left: x, top: y }}
      className={cn(
        "fixed z-[1000] w-[216px] rounded-xl border border-black/10 bg-white p-1.5",
        "text-[13px] text-[#1f1f1f] shadow-[0_12px_32px_rgba(0,0,0,0.18)]",
      )}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          role="menuitem"
          disabled={action.disabled}
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left outline-none transition-colors",
            "hover:bg-black/5 focus-visible:bg-black/5 disabled:pointer-events-none disabled:opacity-40",
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            action.onSelect();
          }}
        >
          <X className="h-4 w-4 shrink-0 text-[#5f6368]" />
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </div>
  );
};
