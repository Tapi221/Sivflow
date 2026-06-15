import type { CSSProperties } from "react";
import { TAG_COLOR_PALETTE } from "@shared/design-tokens/color/Color.Tag";
import { getTagColorKey } from "@/chip/budge/tag/tag.parser";
import type { TagColorKey } from "@shared/design-tokens/color/Color.Tag";

const getTagPalette = (input?: string) => {
  const colorKey = getTagColorKey(input);
  return { colorKey, palette: TAG_COLOR_PALETTE[colorKey] };
};
const getTagBackgroundColor = (colorKey: TagColorKey): string => `var(--ds-color-tag-${colorKey}-bg)`;
const getTagColorStyle = (input?: string): CSSProperties => {
  const { colorKey, palette } = getTagPalette(input);
  return {
    backgroundColor: getTagBackgroundColor(colorKey),
    color: palette.fg,
    borderColor: palette.border,
  };
};
const getTagColorSwatchStyle = (input?: string): CSSProperties => {
  const { palette } = getTagPalette(input);
  return {
    backgroundColor: palette.swatch,
    borderColor: palette.border,
    color: palette.fg,
  };
};

export { getTagColorStyle, getTagColorSwatchStyle };
