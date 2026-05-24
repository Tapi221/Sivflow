import { type CSSProperties, type RefObject } from "react";
import { getTagColorSwatchStyle, type TagColorKey } from "@/features/tag/tagColor";
import { cn } from "@/lib/utils";
import { RightClickPanelSurface } from "./rightClickPanelCommon";
import { RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_SURFACE_PADDING, resolveRightClickPanelTextWidth } from "./rightClickPanelUtils";

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

const TAG_COLOR_CONTEXT_MENU_TITLE = "タグの色";
const TAG_COLOR_GRID_COLUMNS = 5;
const TAG_COLOR_SWATCH_SIZE = 16;
const TAG_COLOR_GRID_GAP = 6;
const TAG_COLOR_GRID_HORIZONTAL_PADDING = 8;
const TAG_COLOR_GRID_TOP_PADDING = 4;
const TAG_COLOR_GRID_BOTTOM_PADDING = 8;
const TAG_COLOR_GRID_WIDTH =
  TAG_COLOR_GRID_COLUMNS * TAG_COLOR_SWATCH_SIZE +
  (TAG_COLOR_GRID_COLUMNS - 1) * TAG_COLOR_GRID_GAP +
  TAG_COLOR_GRID_HORIZONTAL_PADDING * 2;

export const TAG_COLOR_CONTEXT_MENU_WIDTH = Math.ceil(
  Math.max(
    resolveRightClickPanelTextWidth([TAG_COLOR_CONTEXT_MENU_TITLE]),
    TAG_COLOR_GRID_WIDTH + RIGHT_CLICK_PANEL_SURFACE_PADDING * 2,
  ),
);
export const TAG_COLOR_CONTEXT_MENU_HEIGHT = 92;
export const TAG_COLOR_CONTEXT_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

const TAG_COLOR_GRID_STYLE = `
.tag-color-context-menu-grid {
  display: grid;
  grid-template-columns: repeat(${TAG_COLOR_GRID_COLUMNS}, ${TAG_COLOR_SWATCH_SIZE}px);
  justify-content: start;
  gap: ${TAG_COLOR_GRID_GAP}px;
  padding: ${TAG_COLOR_GRID_TOP_PADDING}px ${TAG_COLOR_GRID_HORIZONTAL_PADDING}px ${TAG_COLOR_GRID_BOTTOM_PADDING}px;
}
`;

type TagColorRightClickPanelProps = {
  x: number;
  y: number;
  availableColors: TagColorKey[];
  currentColorKey: TagColorKey;
  tagName: string;
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
  onSelectColor: (colorKey: TagColorKey) => void;
};

export const TagColorRightClickPanel = ({
  x,
  y,
  availableColors,
  currentColorKey,
  tagName,
  menuRef,
  noDragStyle,
  onSelectColor,
}: TagColorRightClickPanelProps) => {
  return (
    <>
      <style>{TAG_COLOR_GRID_STYLE}</style>
      <RightClickPanelSurface
        x={x}
        y={y}
        width={TAG_COLOR_CONTEXT_MENU_WIDTH}
        panelRef={menuRef}
        noDragStyle={noDragStyle}
        ariaLabel={`${tagName} tag color menu`}
      >
        <div className="right-click-panel-title">{TAG_COLOR_CONTEXT_MENU_TITLE}</div>
        <div className="tag-color-context-menu-grid">
          {availableColors.map((colorKey) => {
            const isSelected = colorKey === currentColorKey;
            const colorLabel = TAG_COLOR_LABELS[colorKey] ?? colorKey;

            return (
              <button
                key={colorKey}
                type="button"
                aria-label={`${tagName}の色を${colorLabel}に変更`}
                aria-pressed={isSelected}
                title={colorLabel}
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35",
                  isSelected &&
                    "ring-2 ring-primary-500/35 ring-offset-1 ring-offset-white",
                )}
                style={getTagColorSwatchStyle(colorKey)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectColor(colorKey);
                }}
              >
                {isSelected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </button>
            );
          })}
        </div>
      </RightClickPanelSurface>
    </>
  );
};
