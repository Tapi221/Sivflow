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

export const DEFAULT_TAG_COLOR_KEY: TagColorKey = "slate";
export const DEFAULT_TAG_COLOR_CLASS_NAME = `tag-color-${DEFAULT_TAG_COLOR_KEY}`;

export const LEGACY_TAG_COLOR_TO_KEY: Record<string, TagColorKey> = {
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

export const isTagColorKey = (value: unknown): value is TagColorKey =>
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

export const getTagColorSwatchClassName = (input?: string): string =>
  `tag-color-swatch-${getTagColorKey(input)}`;




