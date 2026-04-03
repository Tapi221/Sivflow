import type { CSSProperties } from "react";

export const TAG_COLOR_KEYS = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

type TagColorPalette = {
  bg: string;
  fg: string;
  border: string;
  swatch: string;
};

const DEFAULT_TAG_COLOR_KEY: TagColorKey = "slate";
export const DEFAULT_TAG_COLOR_CLASS_NAME = `tag-color-${DEFAULT_TAG_COLOR_KEY}`;

const TAG_COLOR_PALETTE: Record<TagColorKey, TagColorPalette> = {
  slate: {
    bg: "#f8fafc",
    fg: "#475569",
    border: "#cbd5e1",
    swatch: "#94a3b8",
  },
  red: {
    bg: "#fef2f2",
    fg: "#b91c1c",
    border: "#fecaca",
    swatch: "#f87171",
  },
  orange: {
    bg: "#fff7ed",
    fg: "#c2410c",
    border: "#fed7aa",
    swatch: "#fb923c",
  },
  amber: {
    bg: "#fffbeb",
    fg: "#b45309",
    border: "#fde68a",
    swatch: "#fbbf24",
  },
  green: {
    bg: "#f0fdf4",
    fg: "#15803d",
    border: "#bbf7d0",
    swatch: "#4ade80",
  },
  emerald: {
    bg: "#ecfdf5",
    fg: "#047857",
    border: "#a7f3d0",
    swatch: "#34d399",
  },
  teal: {
    bg: "#f0fdfa",
    fg: "#0f766e",
    border: "#99f6e4",
    swatch: "#2dd4bf",
  },
  cyan: {
    bg: "#ecfeff",
    fg: "#0e7490",
    border: "#a5f3fc",
    swatch: "#22d3ee",
  },
  sky: {
    bg: "#f0f9ff",
    fg: "#0369a1",
    border: "#bae6fd",
    swatch: "#38bdf8",
  },
  blue: {
    bg: "#eff6ff",
    fg: "#1d4ed8",
    border: "#bfdbfe",
    swatch: "#60a5fa",
  },
  indigo: {
    bg: "#eef2ff",
    fg: "#4338ca",
    border: "#c7d2fe",
    swatch: "#818cf8",
  },
  violet: {
    bg: "#f5f3ff",
    fg: "#6d28d9",
    border: "#ddd6fe",
    swatch: "#a78bfa",
  },
  purple: {
    bg: "#faf5ff",
    fg: "#7e22ce",
    border: "#e9d5ff",
    swatch: "#c084fc",
  },
  fuchsia: {
    bg: "#fdf4ff",
    fg: "#a21caf",
    border: "#f5d0fe",
    swatch: "#e879f9",
  },
  pink: {
    bg: "#fdf2f8",
    fg: "#be185d",
    border: "#fbcfe8",
    swatch: "#f472b6",
  },
  rose: {
    bg: "#fff1f2",
    fg: "#be123c",
    border: "#fecdd3",
    swatch: "#fb7185",
  },
};

const LEGACY_TAG_COLOR_TO_KEY: Record<string, TagColorKey> = {
  "bg-slate-100 text-slate-600 border-slate-200": "slate",
  "bg-red-50 text-red-600 border-red-200": "red",
  "bg-orange-50 text-orange-600 border-orange-200": "orange",
  "bg-amber-50 text-amber-600 border-amber-200": "amber",
  "bg-green-50 text-green-600 border-green-200": "green",
  "bg-emerald-50 text-emerald-600 border-emerald-200": "emerald",
  "bg-teal-50 text-teal-600 border-teal-200": "teal",
  "bg-cyan-50 text-cyan-600 border-cyan-200": "cyan",
  "bg-sky-50 text-sky-600 border-sky-200": "sky",
  "bg-blue-50 text-blue-600 border-blue-200": "blue",
  "bg-indigo-50 text-indigo-600 border-indigo-200": "indigo",
  "bg-violet-50 text-violet-600 border-violet-200": "violet",
  "bg-purple-50 text-purple-600 border-purple-200": "purple",
  "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200": "fuchsia",
  "bg-pink-50 text-pink-600 border-pink-200": "pink",
  "bg-rose-50 text-rose-600 border-rose-200": "rose",
};

const TAG_COLOR_KEY_SET = new Set<string>(TAG_COLOR_KEYS);

const isTagColorKey = (value: unknown): value is TagColorKey =>
  typeof value === "string" && TAG_COLOR_KEY_SET.has(value);

const detectLegacyKey = (legacyClassName: string): TagColorKey | null => {
  for (const key of TAG_COLOR_KEYS) {
    const pattern = new RegExp(`(^|\\s)(bg|text|border)-${key}-`);
    if (pattern.test(legacyClassName)) return key;
  }
  return null;
};

// legacy互換: class文字列や tag-color-* を colorKey に正規化
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

  const mapped = LEGACY_TAG_COLOR_TO_KEY[normalizedInput];
  if (mapped) return mapped;
  return detectLegacyKey(normalizedInput) ?? DEFAULT_TAG_COLOR_KEY;
};

// UI用クラス解決
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
