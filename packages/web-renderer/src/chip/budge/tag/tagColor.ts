import type { TagColorKey, TagColorPalette } from "@shared/design-tokens/color/Color.Tag";
import { DEFAULT_TAG_COLOR_KEY, TAG_COLOR_KEYS, TAG_COLOR_PALETTE } from "@shared/design-tokens/color/Color.Tag";
import type { CSSProperties } from "react";



const TAG_COLOR_KEY_SET = new Set<string>(TAG_COLOR_KEYS);



const isTagColorKey = (value: unknown): value is TagColorKey => typeof value === "string" && TAG_COLOR_KEY_SET.has(value);
const getTagColorKey = (input?: string): TagColorKey => {
  if (!input) return DEFAULT_TAG_COLOR_KEY;
  const normalized = input.trim();
  if (!normalized) return DEFAULT_TAG_COLOR_KEY;
  if (isTagColorKey(normalized)) return normalized;
  const match = normalized.match(/^tag-color(?:-swatch)?-([a-z]+)$/);
  if (match && isTagColorKey(match[1])) {
    return match[1];
  }
  return DEFAULT_TAG_COLOR_KEY;
};
const getTagColorClassName = (input?: string): string => `tag-color-${getTagColorKey(input)}`;
const getTagBackgroundColor = (colorKey: TagColorKey): string => `var(--ds-color-tag-${colorKey}-bg)`;
const getTagPalette = (input?: string) => {
  const colorKey = getTagColorKey(input);
  return { colorKey, palette: TAG_COLOR_PALETTE[colorKey] };
};
const getTagColorStyle = (input?: string): CSSProperties => {
  const { colorKey, palette } = getTagPalette(input);
  return {
    backgroundColor: getTagBackgroundColor(colorKey),
    color: palette.fg,
    borderColor: palette.border,
  };
};
const getTagColorSwatchStyle = (input?: string): CSSProperties => {
  const { palette } = getTagPalette(input);
  return {
    backgroundColor: palette.swatch,
    borderColor: palette.border,
    color: palette.fg,
  };
};



export { DEFAULT_TAG_COLOR_KEY, TAG_COLOR_KEYS, getTagColorClassName, getTagColorKey, getTagColorStyle, getTagColorSwatchStyle };


export type { TagColorKey, TagColorPalette };
