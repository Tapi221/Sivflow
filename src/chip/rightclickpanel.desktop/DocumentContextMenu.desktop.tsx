import { memo, type CSSProperties, type RefObject } from "react";
import { RightClickPanelSurface } from "./rightClickPanelCommon";
import { RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, resolveRightClickPanelTextWidth, type RightClickPanelId } from "./rightClickPanel.utils";

export type DocumentContextMenuActionId = "rename" | "delete";

export type DocumentContextMenuAction = {
  id: DocumentContextMenuActionId;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type DocumentContextMenuProps = {
  x: number;
  y: number;
  actions: DocumentContextMenuAction[];
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
  panelId?: RightClickPanelId;
};

export const DOCUMENT_CONTEXT_MENU_PANEL_ID = "document-context-menu";

const DOCUMENT_CONTEXT_MENU_LABELS = [
  "名前を変更",
  "削除",
];

export const DOCUMENT_CONTEXT_MENU_WIDTH = resolveRightClickPanelTextWidth(DOCUMENT_CONTEXT_MENU_LABELS, 96);
export const DOCUMENT_CONTEXT_MENU_HEIGHT = DOCUMENT_CONTEXT_MENU_LABELS.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
export const DOCUMENT_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const DOCUMENT_CONTEXT_MENU_STYLE = `
.document-context-menu-item--danger {
  color: #b91c1c;
}

.document-context-menu-item--danger:not(:disabled):hover,
.document-context-menu-item--danger:not(:disabled):focus-visible {
  background: #fef2f2;
}
`;

const DocumentContextMenuBase = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
  panelId = DOCUMENT_CONTEXT_MENU_PANEL_ID,
}: DocumentContextMenuProps) => {
  return (
    <>
      <style>{DOCUMENT_CONTEXT_MENU_STYLE}</style>
      <RightClickPanelSurface x={x} y={y} width={DOCUMENT_CONTEXT_MENU_WIDTH} panelRef={menuRef} noDragStyle={noDragStyle} ariaLabel="document context menu" panelId={panelId}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            className={["right-click-panel-item", action.danger ? "document-context-menu-item--danger" : null].filter(Boolean).join(" ")}
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
    </>
  );
};

const DocumentContextMenu = memo(DocumentContextMenuBase);

DocumentContextMenu.displayName = "DocumentContextMenu";

export { DocumentContextMenu };
