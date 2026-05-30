import type { CSSProperties } from "react";
import { TAG_COLOR_PALETTE } from "@/styles/tokens/tag.palette";
import { getTagColorKey } from "./tag.parser";

const getTagPalette = (input?: string) => {
  const colorKey = getTagColorKey(input);
  return { colorKey, palette: TAG_COLOR_PALETTE[colorKey] };
};

const getTagBackgroundColor = (colorKey: ReturnType<typeof getTagColorKey>): string => `var(--ds-color-tag-${colorKey}-bg)`;

export const getTagColorStyle = (input?: string): CSSProperties => {
  const { colorKey, palette } = getTagPalette(input);

  return {
    backgroundColor: getTagBackgroundColor(colorKey),
    color: palette.fg,
    borderColor: palette.border,
  };
};

export const getTagColorSwatchStyle = (input?: string): CSSProperties => {
  const { palette } = getTagPalette(input);

  return {
    backgroundColor: palette.swatch,
    borderColor: palette.border,
    color: palette.fg,
  };
};
