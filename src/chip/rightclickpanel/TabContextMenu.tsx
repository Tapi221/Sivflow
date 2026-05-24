import { type CSSProperties, type RefObject } from "react";
import { RIGHT_CLICK_PANEL_MARGIN, RightClickPanelSurface } from "./rightClickPanelCommon";

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

export const WORKSPACE_TAB_CONTEXT_MENU_WIDTH = 176;
export const WORKSPACE_TAB_CONTEXT_MENU_HEIGHT = 120;
export const WORKSPACE_TAB_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

export const WorkspaceTabContextMenu = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
}: TabContextMenuProps) => {
  return (
    <RightClickPanelSurface
      x={x}
      y={y}
      width={WORKSPACE_TAB_CONTEXT_MENU_WIDTH}
      panelRef={menuRef}
      noDragStyle={noDragStyle}
      ariaLabel="tab context menu"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={action.disabled}
          className="right-click-panel-item"
          role="menuitem"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (action.disabled) return;

            action.onSelect();
          }}
        >
          {action.label}
        </button>
      ))}
    </RightClickPanelSurface>
  );
};
