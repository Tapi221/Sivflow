import type { CSSProperties } from "react";

import { TAG_COLOR_PALETTE } from "./tag.palette";
import { getTagColorKey } from "./tag.parser";

const getPalette = (input?: string) => TAG_COLOR_PALETTE[getTagColorKey(input)];

export const getTagColorStyle = (input?: string): CSSProperties => {
  const palette = getPalette(input);

  return {
    backgroundColor: palette.bg,
    color: palette.fg,
    borderColor: palette.border,
  };
};

export const getTagColorSwatchStyle = (input?: string): CSSProperties => {
  const palette = getPalette(input);

  return {
    backgroundColor: palette.swatch,
    borderColor: palette.border,
    color: palette.fg,
  };
};
