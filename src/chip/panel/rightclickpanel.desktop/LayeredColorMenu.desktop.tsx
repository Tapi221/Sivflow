import { memo } from "react";
import type { CSSProperties, RefObject } from "react";
import type { TagColorKey } from "@shared/design-tokens/color/Color.Tag";
import { RightClickPanel } from "@/chip/panel/rightclickpanel";
import type { RightClickPanelId } from "@/chip/panel/rightClickPanel.utils";
import { RIGHT_CLICK_PANEL_MARGIN } from "@/chip/panel/rightClickPanel.utils";

type LayeredColorMenuOption = { id: TagColorKey; label: string; value: string };
type LayeredColorMenuProps = { x: number; y: number; options?: readonly LayeredColorMenuOption[]; currentColor?: string | null; menuRef: RefObject<HTMLDivElement | null>; noDragStyle: CSSProperties; panelId?: RightClickPanelId; onSelectColor: (color: string) => void };

const LAYERED_COLOR_MENU_PANEL_ID = "layered-color-submenu";
const LAYERED_COLOR_MENU_OPTIONS: readonly LayeredColorMenuOption[] = [];
const LAYERED_COLOR_MENU_WIDTH = 138;
const LAYERED_COLOR_MENU_HEIGHT = 72;
const LAYERED_COLOR_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const LayeredColorMenuBase = ({ x, y, options = LAYERED_COLOR_MENU_OPTIONS, menuRef, noDragStyle, panelId = LAYERED_COLOR_MENU_PANEL_ID, onSelectColor }: LayeredColorMenuProps) => (
  <RightClickPanel id={panelId} x={x} y={y} width={LAYERED_COLOR_MENU_WIDTH} panelRef={menuRef} style={noDragStyle} ariaLabel="color submenu">
    <div>
      {options.map((option) => <button key={option.id} type="button" onClick={() => onSelectColor(option.value)}>{option.label}</button>)}
    </div>
  </RightClickPanel>
);
const LayeredColorMenu = memo(LayeredColorMenuBase);
LayeredColorMenu.displayName = "LayeredColorMenu";
export { LayeredColorMenu, LAYERED_COLOR_MENU_PANEL_ID, LAYERED_COLOR_MENU_OPTIONS, LAYERED_COLOR_MENU_WIDTH, LAYERED_COLOR_MENU_HEIGHT, LAYERED_COLOR_MENU_MARGIN };
export type { LayeredColorMenuOption };
