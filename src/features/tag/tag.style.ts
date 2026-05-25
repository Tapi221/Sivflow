import type { CSSProperties } from "react";
import { TAG_COLOR_PALETTE } from "./tag.palette";
import { getTagColorKey } from "./tag.parser";

const getPalette = (input?: string) => TAG_COLOR_PALETTE[getTagColorKey(input)];

const getPaletteSurface = (palette: ReturnType<typeof getPalette>) =>
  `color-mix(in srgb, ${palette.swatch} 42%, ${palette.bg})`;

export const getTagColorStyle = (input?: string): CSSProperties => {
  const palette = getPalette(input);

  return {
    backgroundColor: getPaletteSurface(palette),
    color: palette.fg,
    borderColor: palette.border,
  };
};

export const getTagColorSwatchStyle = (input?: string): CSSProperties => {
  const palette = getPalette(input);

  return {
    backgroundColor: getPaletteSurface(palette),
    borderColor: palette.border,
    color: palette.fg,
  };
};
