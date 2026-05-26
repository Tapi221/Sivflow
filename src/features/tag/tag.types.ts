import { TAG_COLOR_KEYS } from "./tag.constants";

export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

export type TagColorPalette = {
  fg: string;
  border: string;
  swatch: string;
};
