import { TAG_COLOR_KEYS } from "./tag.constants";



type TagColorKey = (typeof TAG_COLOR_KEYS)[number];
type TagColorPalette = { fg: string;
  fgRgb: string;
  border: string;
  swatch: string;
};

export type { TagColorKey, TagColorPalette };
