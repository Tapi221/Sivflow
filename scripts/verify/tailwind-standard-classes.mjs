import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/android/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/android-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const ROOT_TEXT_FILES = ["tailwind.config.js", "postcss.config.js", "eslint.config.js", "vite.config.ts"].map((fileName) => path.join(ROOT_DIR, fileName));
const TEXT_EXTENSIONS = new Set([".cjs", ".css", ".html", ".js", ".jsx", ".json", ".md", ".mjs", ".scss", ".svg", ".ts", ".tsx", ".webmanifest", ".xml"]);
const EXCLUDED_PATH_PARTS = ["/node_modules/", "/dist/", "/build/", "/coverage/", "/.git/", "/.turbo/", "/target/"];
const EXCLUDED_RELATIVE_PATHS = new Set(["scripts/verify/tailwind-standard-classes.mjs"]);
const EXACT_CLASS_REPLACEMENTS = [
  ["max-w-[80vw]", "max-w-full"],
  ["rounded-[4px]", "rounded"],
  ["rounded-[6px]", "rounded-md"],
  ["rounded-[8px]", "rounded-lg"],
  ["rounded-[9px]", "rounded-lg"],
  ["rounded-[10px]", "rounded-xl"],
  ["rounded-[11px]", "rounded-xl"],
  ["rounded-[12px]", "rounded-xl"],
  ["rounded-[13px]", "rounded-2xl"],
  ["rounded-[14px]", "rounded-2xl"],
  ["rounded-[18px]", "rounded-2xl"],
  ["rounded-[22px]", "rounded-3xl"],
  ["rounded-[24px]", "rounded-3xl"],
  ["shadow-[0_1px_2px_rgba(0,0,0,0.04)]", "shadow-sm"],
  ["shadow-[0_6px_20px_rgba(0,0,0,0.14),0_1px_6px_rgba(0,0,0,0.08)]", "shadow-lg"],
  ["shadow-[0_8px_18px_rgba(92,128,154,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]", "shadow-lg"],
  ["shadow-[0_8px_24px_rgba(15,23,42,0.06)]", "shadow-lg"],
  ["shadow-[0_10px_30px_rgba(15,23,42,0.06)]", "shadow-xl"],
  ["shadow-[0_14px_34px_rgba(74,90,110,0.16),inset_0_1px_0_rgba(255,255,255,0.9)]", "shadow-xl"],
  ["shadow-[0_0_0_3px_rgba(255,255,255,0.72)]", "ring-2 ring-white/70"],
  ["shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]", "shadow-inner"],
  ["zoom-in-[0.98]", "zoom-in-95"],
  ["focus-visible:ring-[3px]", "focus-visible:ring-2"],
  ["leading-[1.7]", "leading-7"],
  ["tracking-[-0.01em]", "tracking-tight"],
  ["tracking-[-0.02em]", "tracking-tight"],
  ["tracking-[-0.03em]", "tracking-tight"],
  ["tracking-[-0.04em]", "tracking-tighter"],
  ["font-[450]", "font-medium"],
  ["border-[#eee]", "border-slate-200"],
  ["border-[#dddcd5]", "border-stone-300"],
  ["border-[#d8d4ca]", "border-stone-300"],
  ["border-[#e5e5ea]", "border-zinc-200"],
  ["border-[#dadde3]", "border-slate-300"],
  ["border-[#dceefa]/80", "border-sky-100/80"],
  ["border-[rgba(0,0,0,0.12)]", "border-black/10"],
  ["border-[var(--surface-border)]", "border-slate-200"],
  ["hover:border-[#c7c7cc]", "hover:border-zinc-300"],
  ["ring-[#dedede]", "ring-slate-200"],
  ["focus-visible:ring-[#007aff]", "focus-visible:ring-blue-500"],
  ["focus-visible:ring-[#8db9ff]/40", "focus-visible:ring-blue-300/40"],
  ["focus:border-[#b9b1a2]", "focus:border-stone-400"],
  ["bg-[#eee]", "bg-slate-100"],
  ["bg-[#f7f7f7]", "bg-zinc-100"],
  ["bg-[#f7f7f8]", "bg-zinc-50"],
  ["bg-[#f7f5ef]", "bg-stone-50"],
  ["bg-[#f8f8f9]", "bg-zinc-50"],
  ["bg-[#fbfaf7]", "bg-stone-50"],
  ["bg-[#f8fcff]/95", "bg-sky-50/95"],
  ["bg-[#24211d]", "bg-stone-900"],
  ["bg-[#e8f2ff]", "bg-blue-50"],
  ["bg-[#f2f7fb]/90", "bg-sky-50/90"],
  ["bg-[rgba(255,255,255,0.62)]", "bg-white/60"],
  ["bg-[rgba(255,255,255,0.84)]", "bg-white/85"],
  ["bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.68)_42%,rgba(255,255,255,0)_78%)]", "bg-white/70"],
  ["hover:bg-[#fafafa]", "hover:bg-slate-50"],
  ["hover:bg-[#f6eeee]", "hover:bg-red-50"],
  ["hover:bg-[#f7f7f8]", "hover:bg-zinc-50"],
  ["hover:bg-[#3a352f]", "hover:bg-stone-700"],
  ["hover:bg-[#FFFBF0]", "hover:bg-amber-50"],
  ["hover:bg-[#EEFDF6]", "hover:bg-emerald-50"],
  ["data-[state=checked]:border-[oklch(0.205_0_0)]", "data-[state=checked]:border-neutral-900"],
  ["data-[state=checked]:bg-[oklch(0.205_0_0)]", "data-[state=checked]:bg-neutral-900"],
  ["data-[state=checked]:text-[oklch(0.985_0_0)]", "data-[state=checked]:text-neutral-50"],
  ["dark:data-[state=checked]:border-[oklch(0.922_0_0)]", "dark:data-[state=checked]:border-neutral-100"],
  ["dark:data-[state=checked]:bg-[oklch(0.922_0_0)]", "dark:data-[state=checked]:bg-neutral-100"],
  ["dark:data-[state=checked]:text-[oklch(0.205_0_0)]", "dark:data-[state=checked]:text-neutral-900"],
  ["text-[#007aff]", "text-blue-500"],
  ["text-[#00A3FF]", "text-sky-500"],
  ["text-[#00B67A]", "text-emerald-500"],
  ["text-[#111]", "text-neutral-950"],
  ["text-[#1c1c1e]", "text-zinc-900"],
  ["text-[#1e293b]", "text-slate-800"],
  ["text-[#24211d]", "text-stone-900"],
  ["text-[#3a3a3c]", "text-slate-700"],
  ["text-[#3f3f3f]", "text-slate-700"],
  ["text-[#3f5968]", "text-slate-700"],
  ["text-[#405162]", "text-slate-600"],
  ["text-[#46515f]", "text-slate-600"],
  ["text-[#48616f]", "text-slate-600"],
  ["text-[#4a4a4a]", "text-neutral-600"],
  ["text-[#52616f]", "text-slate-600"],
  ["text-[#5f5a52]", "text-stone-600"],
  ["text-[#64748b]", "text-slate-500"],
  ["text-[#666]", "text-slate-600"],
  ["text-[#6b8294]", "text-slate-500"],
  ["text-[#6d8998]", "text-slate-500"],
  ["text-[#6e6e73]", "text-zinc-500"],
  ["text-[#7a756d]", "text-stone-500"],
  ["text-[#8e8e93]", "text-zinc-500"],
  ["text-[#8f929c]", "text-slate-500"],
  ["text-[#94a3b8]", "text-slate-400"],
  ["text-[#9a4d4d]", "text-red-700"],
  ["text-[#9aa0aa]", "text-slate-400"],
  ["text-[#a1a1aa]", "text-zinc-400"],
  ["text-[#b8b8b8]", "text-slate-400"],
  ["text-[#F9A825]", "text-amber-500"],
  ["text-[#FF5A65]", "text-red-400"],
  ["group-hover:text-[#00A3FF]", "group-hover:text-sky-500"],
  ["group-hover:text-[#00B67A]", "group-hover:text-emerald-500"],
  ["group-hover:text-[#F9A825]", "group-hover:text-amber-500"],
  ["group-hover:text-[#FF5A65]", "group-hover:text-red-400"],
  ["hover:text-[#4c5361]", "hover:text-slate-600"],
];
const TEXT_SIZE_REPLACEMENTS = new Map([
  [8, "text-xs"],
  [9, "text-xs"],
  [10, "text-xs"],
  [11, "text-xs"],
  [12, "text-xs"],
  [13, "text-xs"],
  [14, "text-sm"],
  [15, "text-sm"],
  [16, "text-base"],
  [17, "text-base"],
  [18, "text-lg"],
  [19, "text-lg"],
  [20, "text-xl"],
  [21, "text-xl"],
  [22, "text-2xl"],
  [23, "text-2xl"],
  [24, "text-2xl"],
  [28, "text-3xl"],
  [30, "text-3xl"],
  [32, "text-4xl"],
]);
const SPACING_PREFIXES = ["min-w", "max-w", "min-h", "max-h", "inset-x", "inset-y", "size", "w", "h", "p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml", "top", "right", "bottom", "left", "gap", "gap-x", "gap-y", "space-x", "space-y", "translate-x", "translate-y", "scroll-m", "scroll-mx", "scroll-my", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml", "scroll-p", "scroll-px", "scroll-py", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"];
const SPACING_SCALE = [[1, "px"], [2, "0.5"], [4, "1"], [6, "1.5"], [8, "2"], [10, "2.5"], [12, "3"], [14, "3.5"], [16, "4"], [20, "5"], [24, "6"], [28, "7"], [32, "8"], [36, "9"], [40, "10"], [44, "11"], [48, "12"], [56, "14"], [64, "16"], [80, "20"], [96, "24"], [112, "28"], [128, "32"], [144, "36"], [160, "40"], [176, "44"], [192, "48"], [208, "52"], [224, "56"], [240, "60"], [256, "64"], [288, "72"], [320, "80"], [384, "96"]];
const SPACING_PATTERN = new RegExp(`(?<![\\w-])(${SPACING_PREFIXES.join("|")})-\\[(-?\\d+)px\\]`, "g");
const REM_SPACING_PATTERN = new RegExp(`(?<![\\w-])(${SPACING_PREFIXES.join("|")})-\\[(\\d+(?:\\.\\d+)?)rem\\]`, "g");
const EM_SPACING_PATTERN = new RegExp(`(?<![\\w-])(${SPACING_PREFIXES.join("|")})-\\[(\\d+(?:\\.\\d+)?)em\\]`, "g");
const WIDTH_PERCENT_PATTERN = /(?<![\w-])(w|min-w|max-w|h|min-h|max-h)-\[(\d+)%\]/g;
const TEXT_SIZE_PATTERN = /(?<![\w-])text-\[(\d+)px\]/g;
const ROUNDED_PATTERN = /(?<![\w-])rounded-\[(\d+)px\]/g;
const TRACKING_PATTERN = /(?<![\w-])tracking-\[(-?\d+(?:\.\d+)?)em\]/g;
const LEADING_RATIO_PATTERN = /(?<![\w-])leading-\[(\d+(?:\.\d+)?)\]/g;
const LEADING_PX_PATTERN = /(?<![\w-])leading-\[(\d+)px\]/g;
const DURATION_PATTERN = /(?<![\w-])duration-\[(\d+)ms\]/g;
const Z_INDEX_PATTERN = /(?<![\w-])z-\[(\d+)\]/g;
const OPACITY_PATTERN = /(?<![\w-])opacity-\[(0?\.\d+|1(?:\.0)?|\d{1,3})\]/g;
const BLUR_PATTERN = /(?<![\w-])((?:backdrop-)?blur)-\[(\d+)px\]/g;
const CLASS_TOKEN_PATTERN = /[^\s"'`{}<>]+/gu;
const ARBITRARY_VALUE_SEGMENT_PATTERN = /^!?-?[a-z][a-z0-9-]*-\[[^\]]+\]$/iu;
const COLOR_UTILITY_PATTERN = /^(bg|text|border|ring|divide|outline|accent|caret|decoration|fill|stroke|from|via|to)-\[#([0-9a-f]{3,8})\](\/\d+)?$/iu;
const CSS_VARIABLE_UTILITY_PATTERN = /^(bg|text|border|ring|outline|fill|stroke)-\[var\(--[^\]]+\)\]$/iu;
const ROUNDED_REPLACEMENTS = new Map([
  [5, "rounded"],
  [7, "rounded-md"],
  [15, "rounded-2xl"],
  [16, "rounded-2xl"],
  [20, "rounded-3xl"],
  [26, "rounded-3xl"],
  [28, "rounded-3xl"],
  [32, "rounded-3xl"],
  [40, "rounded-3xl"],
]);
const TRACKING_REPLACEMENTS = new Map([
  ["-0.04", "tracking-tighter"],
  ["-0.03", "tracking-tight"],
  ["-0.025", "tracking-tight"],
  ["-0.02", "tracking-tight"],
  ["-0.018", "tracking-tight"],
  ["-0.012", "tracking-tight"],
  ["-0.01", "tracking-tight"],
  ["-0.005", "tracking-normal"],
  ["0.03", "tracking-wide"],
  ["0.04", "tracking-wide"],
  ["0.08", "tracking-wider"],
  ["0.1", "tracking-widest"],
  ["0.12", "tracking-widest"],
  ["0.16", "tracking-widest"],
  ["0.18", "tracking-widest"],
  ["0.22", "tracking-widest"],
  ["0.24", "tracking-widest"],
  ["0.28", "tracking-widest"],
]);
const LEADING_RATIO_REPLACEMENTS = new Map([
  ["1.3", "leading-5"],
  ["1.35", "leading-5"],
  ["1.6", "leading-6"],
  ["1.7", "leading-7"],
]);
const LEADING_PX_REPLACEMENTS = new Map([
  [18, "leading-none"],
  [22, "leading-6"],
  [24, "leading-6"],
  [28, "leading-7"],
  [32, "leading-8"],
]);
const WIDTH_PERCENT_REPLACEMENTS = new Map([
  [44, "7/12"],
  [50, "1/2"],
  [56, "7/12"],
  [60, "3/5"],
  [67, "2/3"],
  [70, "2/3"],
  [75, "3/4"],
  [80, "4/5"],
  [82, "5/6"],
  [84, "5/6"],
  [90, "11/12"],
  [92, "11/12"],
  [100, "full"],
]);
const DURATION_REPLACEMENTS = [75, 100, 150, 200, 300, 500, 700, 1000];
const Z_INDEX_REPLACEMENTS = [0, 10, 20, 30, 40, 50];
const OPACITY_REPLACEMENTS = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100];
const BLUR_REPLACEMENTS = [[0, "none"], [4, "sm"], [8, ""], [12, "md"], [16, "lg"], [24, "xl"], [40, "2xl"], [64, "3xl"]];
const STANDARD_COLOR_PALETTE = [
  ["black", 0, 0, 0],
  ["white", 255, 255, 255],
  ["slate-50", 248, 250, 252],
  ["slate-100", 241, 245, 249],
  ["slate-200", 226, 232, 240],
  ["slate-300", 203, 213, 225],
  ["slate-400", 148, 163, 184],
  ["slate-500", 100, 116, 139],
  ["slate-600", 71, 85, 105],
  ["slate-700", 51, 65, 85],
  ["slate-800", 30, 41, 59],
  ["slate-900", 15, 23, 42],
  ["zinc-50", 250, 250, 250],
  ["zinc-100", 244, 244, 245],
  ["zinc-200", 228, 228, 231],
  ["zinc-300", 212, 212, 216],
  ["zinc-400", 161, 161, 170],
  ["zinc-500", 113, 113, 122],
  ["zinc-900", 24, 24, 27],
  ["neutral-50", 250, 250, 250],
  ["neutral-600", 82, 82, 82],
  ["neutral-900", 23, 23, 23],
  ["neutral-950", 10, 10, 10],
  ["stone-50", 250, 250, 249],
  ["stone-100", 245, 245, 244],
  ["stone-300", 214, 211, 209],
  ["stone-400", 168, 162, 158],
  ["stone-500", 120, 113, 108],
  ["stone-600", 87, 83, 78],
  ["stone-700", 68, 64, 60],
  ["stone-900", 28, 25, 23],
  ["red-50", 254, 242, 242],
  ["red-400", 248, 113, 113],
  ["red-500", 239, 68, 68],
  ["red-700", 185, 28, 28],
  ["amber-50", 255, 251, 235],
  ["amber-100", 254, 243, 199],
  ["amber-400", 251, 191, 36],
  ["amber-500", 245, 158, 11],
  ["yellow-400", 250, 204, 21],
  ["emerald-50", 236, 253, 245],
  ["emerald-100", 209, 250, 229],
  ["emerald-400", 52, 211, 153],
  ["emerald-500", 16, 185, 129],
  ["blue-50", 239, 246, 255],
  ["blue-100", 219, 234, 254],
  ["blue-300", 147, 197, 253],
  ["blue-400", 96, 165, 250],
  ["blue-500", 59, 130, 246],
  ["sky-50", 240, 249, 255],
  ["sky-100", 224, 242, 254],
  ["sky-400", 56, 189, 248],
  ["sky-500", 14, 165, 233],
  ["cyan-50", 236, 254, 255],
  ["teal-50", 240, 253, 250],
  ["teal-100", 204, 251, 241],
  ["violet-500", 139, 92, 246],
  ["purple-500", 168, 85, 247],
  ["pink-500", 236, 72, 153],
];
const CSS_VARIABLE_REPLACEMENTS = new Map([
  ["bg", "bg-white"],
  ["text", "text-slate-600"],
  ["border", "border-slate-200"],
  ["ring", "ring-slate-200"],
  ["outline", "outline-slate-200"],
  ["fill", "fill-slate-600"],
  ["stroke", "stroke-slate-600"],
]);
const ARBITRARY_UTILITY_FALLBACKS = new Map([
  ["animate", "animate-none"],
  ["aspect", "aspect-video"],
  ["backdrop-blur", "backdrop-blur-lg"],
  ["basis", "basis-auto"],
  ["bg", "bg-slate-50"],
  ["blur", "blur-sm"],
  ["border", "border-slate-200"],
  ["bottom", "bottom-0"],
  ["col", "col-auto"],
  ["content", "content-none"],
  ["duration", "duration-150"],
  ["ease", "ease-out"],
  ["fill", "fill-slate-600"],
  ["flex", "flex-1"],
  ["font", "font-medium"],
  ["grid-cols", "grid-cols-2"],
  ["grid-rows", "grid-rows-2"],
  ["h", "h-full"],
  ["inset", "inset-0"],
  ["left", "left-0"],
  ["max-h", "max-h-full"],
  ["max-w", "max-w-full"],
  ["min-h", "min-h-0"],
  ["min-w", "min-w-0"],
  ["origin", "origin-center"],
  ["outline", "outline-slate-200"],
  ["overflow-y", "overflow-y-auto"],
  ["right", "right-0"],
  ["ring", "ring-2"],
  ["rotate", "rotate-0"],
  ["scale", "scale-100"],
  ["shadow", "shadow-lg"],
  ["stroke", "stroke-slate-600"],
  ["text", "text-slate-600"],
  ["top", "top-0"],
  ["translate-x", "translate-x-0"],
  ["translate-y", "translate-y-0"],
  ["w", "w-full"],
  ["z", "z-50"],
]);

const toPosix = (value) => value.split(path.sep).join("/");
const getRelativePath = (filePath) => toPosix(path.relative(ROOT_DIR, filePath));
const isExcludedPath = (filePath) => {
  const relativePath = `/${getRelativePath(filePath)}`;
  return EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};
const shouldCheckFile = (filePath) => !EXCLUDED_RELATIVE_PATHS.has(getRelativePath(filePath));
const isTextFile = (filePath) => TEXT_EXTENSIONS.has(path.extname(filePath));
const walkTextFiles = (directory) => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    if (isExcludedPath(entryPath)) return [];
    const stat = statSync(entryPath);
    if (stat.isDirectory()) return walkTextFiles(entryPath);
    if (!stat.isFile()) return [];
    if (!isTextFile(entryPath)) return [];
    if (!shouldCheckFile(entryPath)) return [];
    return [entryPath];
  });
};
const getExistingRootTextFiles = () => ROOT_TEXT_FILES.filter((filePath) => existsSync(filePath) && statSync(filePath).isFile() && isTextFile(filePath) && shouldCheckFile(filePath));
const getTextFiles = () => [...new Set([...SOURCE_DIRECTORIES.flatMap(walkTextFiles), ...getExistingRootTextFiles()])];
const findNearestEntry = (entries, value) => {
  let nearest = entries[0];
  for (const entry of entries) {
    const entryValue = Array.isArray(entry) ? entry[0] : entry;
    const nearestValue = Array.isArray(nearest) ? nearest[0] : nearest;
    if (Math.abs(entryValue - value) < Math.abs(nearestValue - value)) nearest = entry;
  }
  return nearest;
};
const findNearestSpacingToken = (pxValue) => findNearestEntry(SPACING_SCALE, pxValue)[1];
const normalizeArbitrarySpacingClass = (_match, prefix, rawValue) => {
  const pxValue = Number(rawValue);
  const token = findNearestSpacingToken(Math.abs(pxValue));
  return pxValue < 0 ? `-${prefix}-${token}` : `${prefix}-${token}`;
};
const normalizeRelativeSpacingClass = (_match, prefix, rawValue) => {
  const pxValue = Math.round(Number(rawValue) * 16);
  const token = findNearestSpacingToken(pxValue);
  return `${prefix}-${token}`;
};
const normalizeArbitraryTextSizeClass = (match, rawValue) => TEXT_SIZE_REPLACEMENTS.get(Number(rawValue)) ?? match;
const normalizeRoundedClass = (match, rawValue) => {
  const pxValue = Number(rawValue);
  if (pxValue >= 999) return "rounded-full";
  return ROUNDED_REPLACEMENTS.get(pxValue) ?? match;
};
const normalizeTrackingClass = (match, rawValue) => TRACKING_REPLACEMENTS.get(String(Number(rawValue))) ?? match;
const normalizeLeadingRatioClass = (match, rawValue) => LEADING_RATIO_REPLACEMENTS.get(String(Number(rawValue))) ?? match;
const normalizeLeadingPxClass = (match, rawValue) => LEADING_PX_REPLACEMENTS.get(Number(rawValue)) ?? match;
const normalizeWidthPercentClass = (match, prefix, rawValue) => {
  const replacement = WIDTH_PERCENT_REPLACEMENTS.get(Number(rawValue));
  return replacement ? `${prefix}-${replacement}` : match;
};
const normalizeDurationClass = (_match, rawValue) => `duration-${findNearestEntry(DURATION_REPLACEMENTS, Number(rawValue))}`;
const normalizeZIndexClass = (_match, rawValue) => `z-${findNearestEntry(Z_INDEX_REPLACEMENTS, Number(rawValue))}`;
const normalizeOpacityClass = (_match, rawValue) => {
  const rawNumber = Number(rawValue);
  const percentValue = rawNumber <= 1 ? rawNumber * 100 : rawNumber;
  return `opacity-${findNearestEntry(OPACITY_REPLACEMENTS, percentValue)}`;
};
const normalizeBlurClass = (_match, prefix, rawValue) => {
  const blurToken = findNearestEntry(BLUR_REPLACEMENTS, Number(rawValue))[1];
  return blurToken ? `${prefix}-${blurToken}` : `${prefix}-none`;
};
const normalizeHex = (hexValue) => {
  if (hexValue.length === 3 || hexValue.length === 4) return hexValue.slice(0, 3).split("").map((character) => `${character}${character}`).join("");
  return hexValue.slice(0, 6);
};
const parseHexColor = (hexValue) => {
  const normalizedHex = normalizeHex(hexValue);
  return [Number.parseInt(normalizedHex.slice(0, 2), 16), Number.parseInt(normalizedHex.slice(2, 4), 16), Number.parseInt(normalizedHex.slice(4, 6), 16)];
};
const getColorDistance = ([red, green, blue], [, paletteRed, paletteGreen, paletteBlue]) => ((red - paletteRed) ** 2) + ((green - paletteGreen) ** 2) + ((blue - paletteBlue) ** 2);
const findNearestColorName = (hexValue) => {
  const color = parseHexColor(hexValue);
  let nearestColor = STANDARD_COLOR_PALETTE[0];
  for (const paletteColor of STANDARD_COLOR_PALETTE) {
    if (getColorDistance(color, paletteColor) < getColorDistance(color, nearestColor)) nearestColor = paletteColor;
  }
  return nearestColor[0];
};
const splitClassSegments = (className) => {
  const segments = [];
  let currentSegment = "";
  let bracketDepth = 0;
  for (const character of className) {
    if (character === "[") bracketDepth += 1;
    if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    if (character === ":" && bracketDepth === 0) {
      segments.push(currentSegment);
      currentSegment = "";
      continue;
    }
    currentSegment += character;
  }
  segments.push(currentSegment);
  return segments;
};
const getClassUtilitySegment = (className) => splitClassSegments(className).at(-1) ?? className;
const isArbitraryValueClassName = (className) => ARBITRARY_VALUE_SEGMENT_PATTERN.test(getClassUtilitySegment(className));
const getArbitraryUtilityPrefix = (utilitySegment) => {
  const normalizedSegment = utilitySegment.replace(/^!/, "").replace(/^-/, "");
  const arbitraryStart = normalizedSegment.indexOf("-[");
  return arbitraryStart === -1 ? normalizedSegment : normalizedSegment.slice(0, arbitraryStart);
};
const normalizeArbitraryUtilitySegment = (utilitySegment) => {
  const colorMatch = utilitySegment.match(COLOR_UTILITY_PATTERN);
  if (colorMatch) {
    const [, utilityPrefix, hexValue, opacitySuffix = ""] = colorMatch;
    return `${utilityPrefix}-${findNearestColorName(hexValue)}${opacitySuffix}`;
  }
  const variableMatch = utilitySegment.match(CSS_VARIABLE_UTILITY_PATTERN);
  if (variableMatch) return CSS_VARIABLE_REPLACEMENTS.get(variableMatch[1]) ?? utilitySegment;
  if (!ARBITRARY_VALUE_SEGMENT_PATTERN.test(utilitySegment)) return utilitySegment;
  const importantPrefix = utilitySegment.startsWith("!") ? "!" : "";
  const negativePrefix = utilitySegment.replace(/^!/, "").startsWith("-") ? "-" : "";
  const utilityPrefix = getArbitraryUtilityPrefix(utilitySegment);
  const fallbackClassName = ARBITRARY_UTILITY_FALLBACKS.get(utilityPrefix);
  if (!fallbackClassName) return utilitySegment;
  if (negativePrefix && fallbackClassName.startsWith(`${utilityPrefix}-`)) return `${importantPrefix}-${fallbackClassName}`;
  return `${importantPrefix}${fallbackClassName}`;
};
const normalizeClassToken = (className) => {
  if (!className.includes("[")) return className;
  const segments = splitClassSegments(className);
  const utilityIndex = segments.length - 1;
  const utilitySegment = segments[utilityIndex] ?? "";
  const normalizedUtilitySegment = normalizeArbitraryUtilitySegment(utilitySegment);
  if (normalizedUtilitySegment === utilitySegment) return className;
  segments[utilityIndex] = normalizedUtilitySegment;
  return segments.join(":");
};
const normalizeTailwindStandardClasses = (source) => {
  let nextSource = source;
  for (const [fromClassName, toClassName] of EXACT_CLASS_REPLACEMENTS) {
    nextSource = nextSource.split(fromClassName).join(toClassName);
  }
  nextSource = nextSource.replace(SPACING_PATTERN, normalizeArbitrarySpacingClass);
  nextSource = nextSource.replace(REM_SPACING_PATTERN, normalizeRelativeSpacingClass);
  nextSource = nextSource.replace(EM_SPACING_PATTERN, normalizeRelativeSpacingClass);
  nextSource = nextSource.replace(WIDTH_PERCENT_PATTERN, normalizeWidthPercentClass);
  nextSource = nextSource.replace(TEXT_SIZE_PATTERN, normalizeArbitraryTextSizeClass);
  nextSource = nextSource.replace(ROUNDED_PATTERN, normalizeRoundedClass);
  nextSource = nextSource.replace(TRACKING_PATTERN, normalizeTrackingClass);
  nextSource = nextSource.replace(LEADING_PX_PATTERN, normalizeLeadingPxClass);
  nextSource = nextSource.replace(LEADING_RATIO_PATTERN, normalizeLeadingRatioClass);
  nextSource = nextSource.replace(DURATION_PATTERN, normalizeDurationClass);
  nextSource = nextSource.replace(Z_INDEX_PATTERN, normalizeZIndexClass);
  nextSource = nextSource.replace(OPACITY_PATTERN, normalizeOpacityClass);
  nextSource = nextSource.replace(BLUR_PATTERN, normalizeBlurClass);
  nextSource = nextSource.replace(CLASS_TOKEN_PATTERN, normalizeClassToken);
  return nextSource;
};
const getLineColumn = (source, offset) => {
  const line = source.slice(0, offset).split("\n").length;
  const lineStart = source.lastIndexOf("\n", offset - 1) + 1;
  return { line, column: offset - lineStart + 1 };
};
const getTailwindStandardClassViolations = (filePath, source) => [...source.matchAll(CLASS_TOKEN_PATTERN)].flatMap((match) => {
  const className = match[0];
  if (!className.includes("[")) return [];
  if (!isArbitraryValueClassName(className)) return [];
  const position = getLineColumn(source, match.index ?? 0);
  const replacement = normalizeTailwindStandardClasses(className);
  const message = replacement === className ? "Tailwind の任意値クラスを標準クラスへ置き換えてください。" : `Tailwind の任意値クラス ${className} は ${replacement} へ置き換えてください。`;
  return [{ filePath, className, message, ...position }];
});

export { getRelativePath, getTailwindStandardClassViolations, getTextFiles, normalizeTailwindStandardClasses };
