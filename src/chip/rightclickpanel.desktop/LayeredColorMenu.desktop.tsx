import { memo, type CSSProperties, type RefObject } from "react";
import { getTagColorSwatchStyle, TAG_COLOR_KEYS, type TagColorKey } from "@/chip/tag/tagColor";
import { TAG_COLOR_PALETTE } from "@shared/styles/tokens/tag.palette";
import { RightClickPanelSurface } from "./rightClickPanelCommon";
import { RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_SURFACE_PADDING, type RightClickPanelId } from "./rightClickPanel.utils";

export type LayeredColorMenuOption = {
  id: TagColorKey;
  label: string;
  value: string;
};

type LayeredColorMenuProps = {
  x: number;
  y: number;
  options?: readonly LayeredColorMenuOption[];
  currentColor?: string | null;
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
  panelId?: RightClickPanelId;
  onSelectColor: (color: string) => void;
};

const TAG_COLOR_LABELS: Record<TagColorKey, string> = {
  gray: "グレー",
  purple: "パープル",
  teal: "ティール",
  pink: "ピンク",
  amber: "アンバー",
  blue: "ブルー",
  green: "グリーン",
  red: "レッド",
  coral: "コーラル",
  sky: "スカイ",
};

export const LAYERED_COLOR_MENU_PANEL_ID = "layered-color-submenu";
export const LAYERED_COLOR_MENU_OPTIONS: readonly LayeredColorMenuOption[] = TAG_COLOR_KEYS.map((colorKey) => ({ id: colorKey, label: TAG_COLOR_LABELS[colorKey], value: TAG_COLOR_PALETTE[colorKey].swatch }));

const LAYERED_COLOR_MENU_GRID_COLUMNS = 5;
const LAYERED_COLOR_MENU_SWATCH_SIZE = 20;
const LAYERED_COLOR_MENU_CORE_SIZE = 7;
const LAYERED_COLOR_MENU_GRID_GAP = 6;
const LAYERED_COLOR_MENU_GRID_HORIZONTAL_PADDING = 8;
const LAYERED_COLOR_MENU_GRID_TOP_PADDING = 8;
const LAYERED_COLOR_MENU_GRID_BOTTOM_PADDING = 8;
const LAYERED_COLOR_MENU_GRID_WIDTH = LAYERED_COLOR_MENU_GRID_COLUMNS * LAYERED_COLOR_MENU_SWATCH_SIZE + (LAYERED_COLOR_MENU_GRID_COLUMNS - 1) * LAYERED_COLOR_MENU_GRID_GAP + LAYERED_COLOR_MENU_GRID_HORIZONTAL_PADDING * 2;
const LAYERED_COLOR_MENU_GRID_HEIGHT = 2 * LAYERED_COLOR_MENU_SWATCH_SIZE + LAYERED_COLOR_MENU_GRID_GAP + LAYERED_COLOR_MENU_GRID_TOP_PADDING + LAYERED_COLOR_MENU_GRID_BOTTOM_PADDING;

export const LAYERED_COLOR_MENU_WIDTH = Math.ceil(LAYERED_COLOR_MENU_GRID_WIDTH + RIGHT_CLICK_PANEL_SURFACE_PADDING * 2);
export const LAYERED_COLOR_MENU_HEIGHT = Math.ceil(LAYERED_COLOR_MENU_GRID_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_PADDING * 2);
export const LAYERED_COLOR_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const LAYERED_COLOR_MENU_STYLE = `
.layered-color-menu-grid {
  display: grid;
  grid-template-columns: repeat(${LAYERED_COLOR_MENU_GRID_COLUMNS}, ${LAYERED_COLOR_MENU_SWATCH_SIZE}px);
  justify-content: start;
  gap: ${LAYERED_COLOR_MENU_GRID_GAP}px;
  padding: ${LAYERED_COLOR_MENU_GRID_TOP_PADDING}px ${LAYERED_COLOR_MENU_GRID_HORIZONTAL_PADDING}px ${LAYERED_COLOR_MENU_GRID_BOTTOM_PADDING}px;
}

.layered-color-menu-swatch {
  display: grid;
  place-items: center;
  width: ${LAYERED_COLOR_MENU_SWATCH_SIZE}px;
  height: ${LAYERED_COLOR_MENU_SWATCH_SIZE}px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.16);
  border-radius: 9999px;
  background: transparent;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.38);
}

.layered-color-menu-swatch:not(:disabled) {
  cursor: default;
}

.layered-color-menu-swatch:not(:disabled):hover,
.layered-color-menu-swatch:not(:disabled):focus-visible {
  outline: 2px solid rgba(0, 0, 0, 0.12);
  outline-offset: 1px;
}

.layered-color-menu-swatch--selected {
  outline: 2px solid rgba(59, 130, 246, 0.42);
  outline-offset: 1px;
}

.layered-color-menu-swatch-core {
  width: ${LAYERED_COLOR_MENU_CORE_SIZE}px;
  height: ${LAYERED_COLOR_MENU_CORE_SIZE}px;
  border-radius: 9999px;
  background: currentColor;
  opacity: 0.7;
}
`;

const normalizeColorValue = (color?: string | null): string | null => color?.trim().toLowerCase() ?? null;

const LayeredColorMenuBase = ({
  x,
  y,
  options = LAYERED_COLOR_MENU_OPTIONS,
  currentColor,
  menuRef,
  noDragStyle,
  panelId = LAYERED_COLOR_MENU_PANEL_ID,
  onSelectColor,
}: LayeredColorMenuProps) => {
  const normalizedCurrentColor = normalizeColorValue(currentColor);

  return (
    <>
      <style>{LAYERED_COLOR_MENU_STYLE}</style>
      <RightClickPanelSurface
        x={x}
        y={y}
        width={LAYERED_COLOR_MENU_WIDTH}
        panelRef={menuRef}
        noDragStyle={noDragStyle}
        ariaLabel="color submenu"
        panelId={panelId}
      >
        <div className="layered-color-menu-grid">
          {options.map((option) => {
            const isSelected = normalizeColorValue(option.value) === normalizedCurrentColor;

            return (
              <button
                key={option.id}
                type="button"
                aria-label={`色を${option.label}に変更`}
                aria-pressed={isSelected}
                title={option.label}
                className={["layered-color-menu-swatch", isSelected ? "layered-color-menu-swatch--selected" : null].filter(Boolean).join(" ")}
                style={getTagColorSwatchStyle(option.id)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectColor(option.value);
                }}
              >
                <span className="layered-color-menu-swatch-core" />
              </button>
            );
          })}
        </div>
      </RightClickPanelSurface>
    </>
  );
};

const LayeredColorMenu = memo(LayeredColorMenuBase);

LayeredColorMenu.displayName = "LayeredColorMenu";

export { LayeredColorMenu };
