import { TAG_COLOR_KEYS } from "./tag.constants";

export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

export type TagColorPalette = {
  bg: string;
  fg: string;
  border: string;
  swatch: string;
};
