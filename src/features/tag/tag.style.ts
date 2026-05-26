import type { CSSProperties } from "react";
import { TAG_COLOR_PALETTE } from "../../styles/tokens/tag.palette";
import { getTagColorKey } from "./tag.parser";

const TAG_BACKGROUND_TEXT_ALPHA = 0.09;

const getPalette = (input?: string) => TAG_COLOR_PALETTE[getTagColorKey(input)];

const getTagBackgroundColor = (input?: string) =>
  `rgb(${getPalette(input).fgRgb} / ${TAG_BACKGROUND_TEXT_ALPHA})`;

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
