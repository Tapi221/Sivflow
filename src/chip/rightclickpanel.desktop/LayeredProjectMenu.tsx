import { memo, type CSSProperties, type RefObject } from "react";
import { RightClickPanelSurface } from "./rightClickPanelCommon";
import { RIGHT_CLICK_PANEL_MARGIN, resolveRightClickPanelTextWidth, type RightClickPanelId } from "./rightClickPanel.utils";

type LayeredProjectMenuItemDefinition = {
  id: LayeredProjectMenuActionId;
  label: string;
  danger?: boolean;
};

export type LayeredProjectMenuActionId = "change-color" | "rename" | "create-card-set" | "create-folder" | "import-pdf" | "hide" | "delete";

export type LayeredProjectMenuAction = {
  id: LayeredProjectMenuActionId;
  disabled?: boolean;
  onSelect: () => void;
};

type LayeredProjectMenuProps = {
  x: number;
  y: number;
  actions: LayeredProjectMenuAction[];
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
  panelId?: RightClickPanelId;
};

export const LAYERED_PROJECT_MENU_PANEL_ID = "layered-project-context-menu";

const LAYERED_PROJECT_MENU_ITEM_HEIGHT = 28;

const LAYERED_PROJECT_MENU_ITEM_DEFINITIONS: readonly LayeredProjectMenuItemDefinition[] = [
  { id: "change-color", label: "色を変更" },
  { id: "rename", label: "名前を変更" },
  { id: "create-card-set", label: "新規カードセット" },
  { id: "create-folder", label: "新規フォルダ" },
  { id: "import-pdf", label: "PDFをインポート" },
  { id: "hide", label: "非表示" },
  { id: "delete", label: "削除", danger: true },
];

const LAYERED_PROJECT_MENU_LABELS = LAYERED_PROJECT_MENU_ITEM_DEFINITIONS.map((item) => item.label);

export const LAYERED_PROJECT_MENU_WIDTH = resolveRightClickPanelTextWidth(LAYERED_PROJECT_MENU_LABELS);
export const LAYERED_PROJECT_MENU_HEIGHT = LAYERED_PROJECT_MENU_ITEM_DEFINITIONS.length * LAYERED_PROJECT_MENU_ITEM_HEIGHT + 8;
export const LAYERED_PROJECT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const LAYERED_PROJECT_MENU_STYLE = `
.layered-project-menu-item--danger {
  color: #b91c1c;
}

.layered-project-menu-item--danger:not(:disabled):hover,
.layered-project-menu-item--danger:not(:disabled):focus-visible {
  background: #fef2f2;
}
`;

const getLayeredProjectMenuAction = (actions: LayeredProjectMenuAction[], id: LayeredProjectMenuActionId) => actions.find((action) => action.id === id);

const LayeredProjectMenuBase = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
  panelId = LAYERED_PROJECT_MENU_PANEL_ID,
}: LayeredProjectMenuProps) => {
  return (
    <>
      <style>{LAYERED_PROJECT_MENU_STYLE}</style>
      <RightClickPanelSurface
        x={x}
        y={y}
        width={LAYERED_PROJECT_MENU_WIDTH}
        panelRef={menuRef}
        noDragStyle={noDragStyle}
        ariaLabel="layered project context menu"
        panelId={panelId}
      >
        {LAYERED_PROJECT_MENU_ITEM_DEFINITIONS.map((item) => {
          const action = getLayeredProjectMenuAction(actions, item.id);
          const isDisabled = action?.disabled ?? false;

          return (
            <button
              key={item.id}
              type="button"
              disabled={isDisabled}
              className={["right-click-panel-item", item.danger ? "layered-project-menu-item--danger" : null].filter(Boolean).join(" ")}
              role="menuitem"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (isDisabled) return;

                action?.onSelect();
              }}
            >
              {item.label}
            </button>
          );
        })}
      </RightClickPanelSurface>
    </>
  );
};

const LayeredProjectMenu = memo(LayeredProjectMenuBase);

LayeredProjectMenu.displayName = "LayeredProjectMenu";

export { LayeredProjectMenu };
