import { memo } from "react";
import type { CSSProperties, RefObject } from "react";
import { RightClickPanel } from "@/chip/panel/rightclickpanel";
import type { RightClickPanelId } from "@/chip/panel/rightClickPanel.utils";
import { resolveRightClickPanelTextWidth, RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE } from "@/chip/panel/rightClickPanel.utils";

type DocumentContextMenuActionId = "rename" | "delete";
type DocumentContextMenuAction = {
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

const DOCUMENT_CONTEXT_MENU_PANEL_ID = "document-context-menu";
const DOCUMENT_CONTEXT_MENU_LABELS = [
  "名前を変更",
  "削除",
];
const DOCUMENT_CONTEXT_MENU_WIDTH = resolveRightClickPanelTextWidth(DOCUMENT_CONTEXT_MENU_LABELS, 96);
const DOCUMENT_CONTEXT_MENU_HEIGHT = DOCUMENT_CONTEXT_MENU_LABELS.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
const DOCUMENT_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;
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
      <RightClickPanel id={panelId} x={x} y={y} width={DOCUMENT_CONTEXT_MENU_WIDTH} panelRef={menuRef} style={noDragStyle} ariaLabel="document context menu">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            className={["panel__item", action.danger ? "document-context-menu-item--danger" : null].filter(Boolean).join(" ")}
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
      </RightClickPanel>
    </>
  );
};

const DocumentContextMenu = memo(DocumentContextMenuBase);
DocumentContextMenu.displayName = "DocumentContextMenu";

export { DocumentContextMenu, DOCUMENT_CONTEXT_MENU_PANEL_ID, DOCUMENT_CONTEXT_MENU_WIDTH, DOCUMENT_CONTEXT_MENU_HEIGHT, DOCUMENT_CONTEXT_MENU_MARGIN };

export type { DocumentContextMenuActionId, DocumentContextMenuAction };
