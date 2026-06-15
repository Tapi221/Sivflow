import { DEFAULT_TAG_COLOR_KEY, TAG_COLOR_KEYS } from "@shared/design-tokens/color/Color.Tag";
import type { TagColorKey, TagColorPalette } from "@shared/design-tokens/color/Color.Tag";
import { getTagColorClassName, getTagColorKey } from "@/chip/budge/tag/tag.parser";
import { getTagColorStyle, getTagColorSwatchStyle } from "@/chip/budge/tag/tag.style";

export { DEFAULT_TAG_COLOR_KEY, TAG_COLOR_KEYS, getTagColorClassName, getTagColorKey, getTagColorStyle, getTagColorSwatchStyle };
export type { TagColorKey, TagColorPalette };
