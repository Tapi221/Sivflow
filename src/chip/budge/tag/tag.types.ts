import { TAG_COLOR_KEYS } from "@shared/design-tokens/color/Color.Tag";
type TagColorKey = (typeof TAG_COLOR_KEYS)[number];
type TagColorPalette = {
  bg: string;
  bgRgb: readonly [number, number, number];
  fg: string;
  fgRgb: readonly [number, number, number];
  border: string;
  swatch: string;
};
export type { TagColorKey, TagColorPalette };
