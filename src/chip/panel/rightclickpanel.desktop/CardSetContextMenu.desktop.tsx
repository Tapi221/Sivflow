import { memo } from "react";
import type { CSSProperties, RefObject } from "react";
import { RightClickPanel } from "@/chip/panel/rightclickpanel";
import type { RightClickPanelId } from "@/chip/panel/rightClickPanel.utils";
import { resolveRightClickPanelTextWidth, RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE } from "@/chip/panel/rightClickPanel.utils";

type CardSetContextMenuActionId = "rename" | "delete";
type CardSetContextMenuAction = {
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

const CARD_SET_CONTEXT_MENU_PANEL_ID = "card-set-context-menu";
const CARD_SET_CONTEXT_MENU_LABELS = [
  "名前を変更",
  "削除",
];
const CARD_SET_CONTEXT_MENU_WIDTH = resolveRightClickPanelTextWidth(CARD_SET_CONTEXT_MENU_LABELS, 96);
const CARD_SET_CONTEXT_MENU_HEIGHT = CARD_SET_CONTEXT_MENU_LABELS.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
const CARD_SET_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;
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
      <RightClickPanel id={panelId} x={x} y={y} width={CARD_SET_CONTEXT_MENU_WIDTH} panelRef={menuRef} style={noDragStyle} ariaLabel="card set context menu">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            className={["panel__item", action.danger ? "card-set-context-menu-item--danger" : null].filter(Boolean).join(" ")}
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

const CardSetContextMenu = memo(CardSetContextMenuBase);
CardSetContextMenu.displayName = "CardSetContextMenu";

export { CardSetContextMenu, CARD_SET_CONTEXT_MENU_PANEL_ID, CARD_SET_CONTEXT_MENU_WIDTH, CARD_SET_CONTEXT_MENU_HEIGHT, CARD_SET_CONTEXT_MENU_MARGIN };
export type { CardSetContextMenuActionId, CardSetContextMenuAction };
