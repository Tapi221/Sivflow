import { useState, type CSSProperties, type RefObject } from "react";
import {
  getTagColorSwatchStyle,
  type TagColorKey,
} from "@/features/tag/tagColor";
import { cn } from "@/lib/utils";

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

export const TAG_COLOR_CONTEXT_MENU_WIDTH = 176;
export const TAG_COLOR_CONTEXT_MENU_HEIGHT = 92;
export const TAG_COLOR_CONTEXT_MENU_MARGIN = 8;

const TAG_COLOR_CONTEXT_MENU_FONT_FAMILY =
  "var(--explorer-chrome-font-family, \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, \"Yu Gothic UI\", \"Hiragino Sans\", sans-serif)";

const TAG_COLOR_CONTEXT_MENU_STYLE = `
.tag-color-context-menu {
  box-sizing: border-box;
  contain: layout paint style;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: ${TAG_COLOR_CONTEXT_MENU_WIDTH}px;
  min-width: ${TAG_COLOR_CONTEXT_MENU_WIDTH}px;
  max-width: ${TAG_COLOR_CONTEXT_MENU_WIDTH}px;
  padding: 3px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14), 0 1px 6px rgba(0, 0, 0, 0.08);
  font-family: ${TAG_COLOR_CONTEXT_MENU_FONT_FAMILY};
  font-variant-east-asian: proportional-width;
  font-feature-settings: "palt" 1;
  animation: none;
  transition: none;
  transform: none;
}

.tag-color-context-menu,
.tag-color-context-menu * {
  box-sizing: border-box;
}

.tag-color-context-menu-title {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 4px;
  color: #4a4a4a;
  font-family: ${TAG_COLOR_CONTEXT_MENU_FONT_FAMILY};
  font-size: 13px;
  font-weight: 400;
  line-height: 15px;
  letter-spacing: 0;
  text-align: left;
  white-space: nowrap;
  -webkit-font-smoothing: antialiased;
}

.tag-color-context-menu-grid {
  display: grid;
  grid-template-columns: repeat(5, 16px);
  justify-content: start;
  gap: 6px;
  padding: 4px 8px 8px;
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
  const [position] = useState(() => ({ x, y }));

  return (
    <>
      <style>{TAG_COLOR_CONTEXT_MENU_STYLE}</style>
      <div
        ref={menuRef}
        style={{
          ...noDragStyle,
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 1000,
          width: TAG_COLOR_CONTEXT_MENU_WIDTH,
          minWidth: TAG_COLOR_CONTEXT_MENU_WIDTH,
          maxWidth: TAG_COLOR_CONTEXT_MENU_WIDTH,
          animation: "none",
          transition: "none",
          transform: "none",
        }}
        className="tag-color-context-menu"
        role="menu"
        aria-label={`${tagName} tag color menu`}
      >
        <div className="tag-color-context-menu-title">タグの色</div>
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
      </div>
    </>
  );
};
