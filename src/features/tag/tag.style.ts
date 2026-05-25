import type { CSSProperties } from "react";
import { TAG_COLOR_PALETTE } from "./tag.palette";
import { getTagColorKey } from "./tag.parser";

const getPalette = (input?: string) => TAG_COLOR_PALETTE[getTagColorKey(input)];

const getTagBackgroundColor = (input?: string) => getPalette(input).bg;

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
