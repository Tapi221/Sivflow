import { memo, type CSSProperties, type RefObject } from "react";
import { RightClickPanelSurface } from "./rightClickPanelCommon";
import { RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, resolveRightClickPanelTextWidth, type RightClickPanelId } from "./rightClickPanel.utils";

export type CardSetContextMenuActionId = "rename" | "delete";

export type CardSetContextMenuAction = {
  id: CardSetContextMenuActionId;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type CardSetContextMenuProps = {
  x: number;
  y: number;
  actions: CardSetContextMenuAction[];
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
  panelId?: RightClickPanelId;
};

export const CARD_SET_CONTEXT_MENU_PANEL_ID = "card-set-context-menu";

const CARD_SET_CONTEXT_MENU_LABELS = [
  "名前を変更",
  "削除",
];

export const CARD_SET_CONTEXT_MENU_WIDTH = resolveRightClickPanelTextWidth(CARD_SET_CONTEXT_MENU_LABELS, 96);
export const CARD_SET_CONTEXT_MENU_HEIGHT = CARD_SET_CONTEXT_MENU_LABELS.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
export const CARD_SET_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const CARD_SET_CONTEXT_MENU_STYLE = `
.card-set-context-menu-item--danger {
  color: #b91c1c;
}

.card-set-context-menu-item--danger:not(:disabled):hover,
.card-set-context-menu-item--danger:not(:disabled):focus-visible {
  background: #fef2f2;
}
`;

const CardSetContextMenuBase = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
  panelId = CARD_SET_CONTEXT_MENU_PANEL_ID,
}: CardSetContextMenuProps) => {
  return (
    <>
      <style>{CARD_SET_CONTEXT_MENU_STYLE}</style>
      <RightClickPanelSurface x={x} y={y} width={CARD_SET_CONTEXT_MENU_WIDTH} panelRef={menuRef} noDragStyle={noDragStyle} ariaLabel="card set context menu" panelId={panelId}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            className={["right-click-panel-item", action.danger ? "card-set-context-menu-item--danger" : null].filter(Boolean).join(" ")}
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

const CardSetContextMenu = memo(CardSetContextMenuBase);

CardSetContextMenu.displayName = "CardSetContextMenu";

export { CardSetContextMenu };
