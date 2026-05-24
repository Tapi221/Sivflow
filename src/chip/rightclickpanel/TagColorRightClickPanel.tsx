import { PopoverContent } from "@/components/ui/popover";
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

const TAG_COLOR_POPOVER_FONT_FAMILY =
  'var(--explorer-chrome-font-family, "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Yu Gothic UI", "Hiragino Sans", sans-serif)';

type TagColorRightClickPanelProps = {
  availableColors: TagColorKey[];
  currentColorKey: TagColorKey;
  tagName: string;
  onSelectColor: (colorKey: TagColorKey) => void;
};

export const TagColorRightClickPanel = ({
  availableColors,
  currentColorKey,
  tagName,
  onSelectColor,
}: TagColorRightClickPanelProps) => {
  return (
    <PopoverContent
      align="start"
      sideOffset={6}
      className="w-auto min-w-[128px] overflow-hidden rounded-[8px] border border-black/[0.12] bg-white p-[3px] shadow-[0_6px_20px_rgba(0,0,0,0.14),0_1px_6px_rgba(0,0,0,0.08)]"
      style={{
        fontFamily: TAG_COLOR_POPOVER_FONT_FAMILY,
        fontFeatureSettings: '"palt" 1',
        fontVariantEastAsian: "proportional-width",
      }}
    >
      <div className="flex min-h-7 items-center rounded px-2.5 text-[13px] font-normal leading-[15px] text-[#4a4a4a] antialiased">
        タグの色
      </div>
      <div className="grid grid-cols-5 gap-1.5 p-2 pt-1">
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
              onClick={() => onSelectColor(colorKey)}
            >
              {isSelected && (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </button>
          );
        })}
      </div>
    </PopoverContent>
  );
};
