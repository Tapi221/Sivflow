import { Fragment, memo, type CSSProperties, type ReactNode, type RefObject } from "react";
import { RightClickPanelSurface } from "./rightClickPanelCommon";
import { RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_SURFACE_PADDING, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, resolveRightClickPanelTextWidth, type RightClickPanelId } from "./rightClickPanel.utils";

type LayeredProjectMenuItemDefinition = {
  id: LayeredProjectMenuActionId;
  label: string;
  danger?: boolean;
  separatorBefore?: boolean;
  submenu?: boolean;
};

export type LayeredProjectMenuActionId = "change-color" | "rename" | "create-card-set" | "create-folder" | "import-pdf" | "add-to-favorites" | "hide" | "delete";

export type LayeredProjectMenuAction = {
  id: LayeredProjectMenuActionId;
  disabled?: boolean;
  onSelect: () => void;
};

export type LayeredProjectMenuSubmenuAnchor = {
  itemOffsetY: number;
};

type LayeredProjectMenuProps = {
  x: number;
  y: number;
  actions: LayeredProjectMenuAction[];
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
  panelId?: RightClickPanelId;
  openSubmenuId?: LayeredProjectMenuActionId | null;
  submenuElement?: ReactNode;
  onOpenSubmenu?: (id: LayeredProjectMenuActionId, anchor: LayeredProjectMenuSubmenuAnchor) => void;
  onCloseSubmenu?: () => void;
};

export const LAYERED_PROJECT_MENU_PANEL_ID = "layered-project-context-menu";

const LAYERED_PROJECT_MENU_SEPARATOR_HEIGHT = 7;

const LAYERED_PROJECT_MENU_ITEM_DEFINITIONS: readonly LayeredProjectMenuItemDefinition[] = [
  { id: "change-color", label: "色を変更", submenu: true },
  { id: "rename", label: "名前を変更" },
  { id: "create-card-set", label: "新規カードセット" },
  { id: "create-folder", label: "新規フォルダ" },
  { id: "import-pdf", label: "PDFをインポート" },
  { id: "add-to-favorites", label: "お気に入りに追加" },
  { id: "hide", label: "非表示" },
  { id: "delete", label: "削除", danger: true, separatorBefore: true },
];

const LAYERED_PROJECT_MENU_LABELS = LAYERED_PROJECT_MENU_ITEM_DEFINITIONS.map((item) => item.label);
const LAYERED_PROJECT_MENU_SEPARATOR_COUNT = LAYERED_PROJECT_MENU_ITEM_DEFINITIONS.filter((item) => item.separatorBefore).length;

export const LAYERED_PROJECT_MENU_WIDTH = resolveRightClickPanelTextWidth(LAYERED_PROJECT_MENU_LABELS, 132);
export const LAYERED_PROJECT_MENU_HEIGHT = LAYERED_PROJECT_MENU_ITEM_DEFINITIONS.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + LAYERED_PROJECT_MENU_SEPARATOR_COUNT * LAYERED_PROJECT_MENU_SEPARATOR_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
export const LAYERED_PROJECT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const LAYERED_PROJECT_MENU_STYLE = `
.right-click-panel.layered-project-menu-panel {
  contain: none;
  overflow: visible;
}

.layered-project-menu-item {
  justify-content: space-between;
  gap: 16px;
}

.layered-project-menu-item--open,
.layered-project-menu-item--open:not(:disabled):hover,
.layered-project-menu-item--open:not(:disabled):focus-visible {
  background: #eeeeee;
}

.layered-project-menu-separator {
  flex: 0 0 auto;
  height: 1px;
  margin: 3px 0;
  background: rgba(0, 0, 0, 0.1);
}

.layered-project-menu-item-chevron {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  color: #4a4a4a;
}

.layered-project-menu-item--danger {
  color: #b91c1c;
}

.layered-project-menu-item--danger:not(:disabled):hover,
.layered-project-menu-item--danger:not(:disabled):focus-visible {
  background: #fef2f2;
}
`;

const getLayeredProjectMenuAction = (actions: LayeredProjectMenuAction[], id: LayeredProjectMenuActionId) => actions.find((action) => action.id === id);

const getLayeredProjectMenuSubmenuAnchor = (index: number): LayeredProjectMenuSubmenuAnchor => ({ itemOffsetY: RIGHT_CLICK_PANEL_SURFACE_PADDING + index * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT });

const LayeredProjectMenuBase = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
  panelId = LAYERED_PROJECT_MENU_PANEL_ID,
  openSubmenuId,
  submenuElement,
  onOpenSubmenu,
  onCloseSubmenu,
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
        className="layered-project-menu-panel"
        ariaLabel="layered project context menu"
        panelId={panelId}
      >
        {LAYERED_PROJECT_MENU_ITEM_DEFINITIONS.map((item, index) => {
          const action = getLayeredProjectMenuAction(actions, item.id);
          const isDisabled = action?.disabled ?? false;
          const isSubmenuOpen = openSubmenuId === item.id;

          return (
            <Fragment key={item.id}>
              {item.separatorBefore ? <div className="layered-project-menu-separator" role="separator" /> : null}

              <button
                type="button"
                disabled={isDisabled}
                className={["right-click-panel-item", "layered-project-menu-item", item.danger ? "layered-project-menu-item--danger" : null, isSubmenuOpen ? "layered-project-menu-item--open" : null].filter(Boolean).join(" ")}
                role="menuitem"
                aria-haspopup={item.submenu ? "menu" : undefined}
                aria-expanded={item.submenu ? isSubmenuOpen : undefined}
                onMouseEnter={() => {
                  if (isDisabled) return;
                  if (item.submenu) {
                    onOpenSubmenu?.(item.id, getLayeredProjectMenuSubmenuAnchor(index));
                    return;
                  }
                  onCloseSubmenu?.();
                }}
                onFocus={() => {
                  if (isDisabled || !item.submenu) return;
                  onOpenSubmenu?.(item.id, getLayeredProjectMenuSubmenuAnchor(index));
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (isDisabled) return;
                  if (item.submenu) {
                    if (onOpenSubmenu) {
                      onOpenSubmenu(item.id, getLayeredProjectMenuSubmenuAnchor(index));
                      return;
                    }

                    action?.onSelect();
                    return;
                  }

                  action?.onSelect();
                }}
              >
                <span>{item.label}</span>
                {item.submenu ? (
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="layered-project-menu-item-chevron">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            </Fragment>
          );
        })}
        {submenuElement}
      </RightClickPanelSurface>
    </>
  );
};

const LayeredProjectMenu = memo(LayeredProjectMenuBase);

LayeredProjectMenu.displayName = "LayeredProjectMenu";

export { LayeredProjectMenu };
