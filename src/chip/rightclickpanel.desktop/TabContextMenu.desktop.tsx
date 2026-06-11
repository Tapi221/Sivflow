import type { CSSProperties, RefObject } from "react";
import type { RightClickPanelId } from "./rightClickPanel.utils";
import { resolveRightClickPanelTextWidth, RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE } from "./rightClickPanel.utils";
import { RightClickPanelSurface } from "./rightClickPanelCommon";

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
  panelId?: RightClickPanelId;
};

const WORKSPACE_TAB_CONTEXT_PANEL_ID = "workspace-tab-context-menu";
const WORKSPACE_TAB_CONTEXT_MENU_LABELS = [
  "閉じる",
  "他を閉じる",
  "このタブ以降を閉じる",
  "すべてを閉じる",
];
const WORKSPACE_TAB_CONTEXT_MENU_WIDTH = resolveRightClickPanelTextWidth(WORKSPACE_TAB_CONTEXT_MENU_LABELS);
const WORKSPACE_TAB_CONTEXT_MENU_HEIGHT = WORKSPACE_TAB_CONTEXT_MENU_LABELS.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
const WORKSPACE_TAB_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const WorkspaceTabContextMenu = ({ x, y, actions, menuRef, noDragStyle, panelId = WORKSPACE_TAB_CONTEXT_PANEL_ID }: TabContextMenuProps) => {
  return (<RightClickPanelSurface x={x} y={y} width={WORKSPACE_TAB_CONTEXT_MENU_WIDTH} panelRef={menuRef} noDragStyle={noDragStyle} ariaLabel="tab context menu" panelId={panelId} > {actions.map((action) => (<button key={action.id} type="button" disabled={action.disabled} className="right-click-panel-item" role="menuitem" onClick={(event) => {
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

export { WORKSPACE_TAB_CONTEXT_PANEL_ID, WORKSPACE_TAB_CONTEXT_MENU_WIDTH, WORKSPACE_TAB_CONTEXT_MENU_HEIGHT, WORKSPACE_TAB_CONTEXT_MENU_MARGIN, WorkspaceTabContextMenu };
