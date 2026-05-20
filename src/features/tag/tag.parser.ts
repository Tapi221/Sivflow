import { DEFAULT_TAG_COLOR_KEY,TAG_COLOR_KEYS } from "./tag.constants";
import type { TagColorKey } from "./tag.types";

const TAG_COLOR_KEY_SET = new Set<string>(TAG_COLOR_KEYS);

const isTagColorKey = (value: unknown): value is TagColorKey =>
  typeof value === "string" && TAG_COLOR_KEY_SET.has(value);

export const getTagColorKey = (input?: string): TagColorKey => {
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

export const getTagColorClassName = (input?: string): string =>
  `tag-color-${getTagColorKey(input)}`;
