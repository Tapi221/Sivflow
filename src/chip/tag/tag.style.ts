import type { CSSProperties } from "react";
import { getTextColorDerivedBackgroundColor } from "@shared/styles/tokens/color-scheme";
import { TAG_COLOR_PALETTE } from "@shared/styles/tokens/tag.palette";
import { getTagColorKey } from "./tag.parser";

const getPalette = (input?: string) => TAG_COLOR_PALETTE[getTagColorKey(input)];

const getTagBackgroundColor = (input?: string) =>
  getTextColorDerivedBackgroundColor(getPalette(input).fgRgb);

export const getTagColorStyle = (input?: string): CSSProperties => {
  const palette = getPalette(input);

  return {
    backgroundColor: getTagBackgroundColor(input),
    color: palette.fg,
    borderColor: palette.border,
  };
};

export const getTagColorSwatchStyle = (input?: string): CSSProperties => {
  const palette = getPalette(input);

  return {
    backgroundColor: getTagBackgroundColor(input),
    borderColor: palette.border,
    color: palette.fg,
  };
};
