import type { CSSProperties } from "react";

export const TAG_COLOR_KEYS = [
  "gray",
  "purple",
  "teal",
  "pink",
  "amber",
  "blue",
  "green",
  "red",
  "coral",
  "sky",
] as const;

export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

type TagColorPalette = {
  bg: string;
  fg: string;
  border: string;
  swatch: string;
};

const DEFAULT_TAG_COLOR_KEY: TagColorKey = "gray";
export const DEFAULT_TAG_COLOR_CLASS_NAME = `tag-color-${DEFAULT_TAG_COLOR_KEY}`;

const TAG_COLOR_PALETTE: Record<TagColorKey, TagColorPalette> = {
  gray: {
    bg: "var(--ds-color-tag-gray-bg)",
    fg: "var(--ds-color-tag-gray-fg)",
    border: "var(--ds-color-tag-gray-border)",
    swatch: "var(--ds-color-tag-gray-fg)",
  },
  purple: {
    bg: "var(--ds-color-tag-purple-bg)",
    fg: "var(--ds-color-tag-purple-fg)",
    border: "var(--ds-color-tag-purple-border)",
    swatch: "var(--ds-color-tag-purple-fg)",
  },
  teal: {
    bg: "var(--ds-color-tag-teal-bg)",
    fg: "var(--ds-color-tag-teal-fg)",
    border: "var(--ds-color-tag-teal-border)",
    swatch: "var(--ds-color-tag-teal-fg)",
  },
  pink: {
    bg: "var(--ds-color-tag-pink-bg)",
    fg: "var(--ds-color-tag-pink-fg)",
    border: "var(--ds-color-tag-pink-border)",
    swatch: "var(--ds-color-tag-pink-fg)",
  },
  amber: {
    bg: "var(--ds-color-tag-amber-bg)",
    fg: "var(--ds-color-tag-amber-fg)",
    border: "var(--ds-color-tag-amber-border)",
    swatch: "var(--ds-color-tag-amber-fg)",
  },
  blue: {
    bg: "var(--ds-color-tag-blue-bg)",
    fg: "var(--ds-color-tag-blue-fg)",
    border: "var(--ds-color-tag-blue-border)",
    swatch: "var(--ds-color-tag-blue-fg)",
  },
  green: {
    bg: "var(--ds-color-tag-green-bg)",
    fg: "var(--ds-color-tag-green-fg)",
    border: "var(--ds-color-tag-green-border)",
    swatch: "var(--ds-color-tag-green-fg)",
  },
  red: {
    bg: "var(--ds-color-tag-red-bg)",
    fg: "var(--ds-color-tag-red-fg)",
    border: "var(--ds-color-tag-red-border)",
    swatch: "var(--ds-color-tag-red-fg)",
  },
  coral: {
    bg: "var(--ds-color-tag-coral-bg)",
    fg: "var(--ds-color-tag-coral-fg)",
    border: "var(--ds-color-tag-coral-border)",
    swatch: "var(--ds-color-tag-coral-fg)",
  },
  sky: {
    bg: "var(--ds-color-tag-sky-bg)",
    fg: "var(--ds-color-tag-sky-fg)",
    border: "var(--ds-color-tag-sky-border)",
    swatch: "var(--ds-color-tag-sky-fg)",
  },
};

const TAG_COLOR_KEY_SET = new Set<string>(TAG_COLOR_KEYS);

const isTagColorKey = (value: unknown): value is TagColorKey =>
  typeof value === "string" && TAG_COLOR_KEY_SET.has(value);

export const getTagColorKey = (input?: string): TagColorKey => {
  if (!input) return DEFAULT_TAG_COLOR_KEY;

  const normalizedInput = input.trim();
  if (!normalizedInput) return DEFAULT_TAG_COLOR_KEY;
  if (isTagColorKey(normalizedInput)) return normalizedInput;

  const prefixedClassMatch = normalizedInput.match(
    /^tag-color(?:-swatch)?-([a-z]+)$/,
  );
  if (prefixedClassMatch && isTagColorKey(prefixedClassMatch[1])) {
    return prefixedClassMatch[1];
  }

  return DEFAULT_TAG_COLOR_KEY;
};

export const getTagColorClassName = (input?: string): string =>
  `tag-color-${getTagColorKey(input)}`;

const getTagColorPalette = (input?: string): TagColorPalette =>
  TAG_COLOR_PALETTE[getTagColorKey(input)];

export const getTagColorStyle = (input?: string): CSSProperties => {
  const palette = getTagColorPalette(input);

  return {
    backgroundColor: palette.bg,
    color: palette.fg,
    borderColor: palette.border,
  };
};

export const getTagColorSwatchStyle = (input?: string): CSSProperties => {
  const palette = getTagColorPalette(input);

  return {
    backgroundColor: palette.swatch,
    borderColor: palette.border,
    color: palette.fg,
  };
};
