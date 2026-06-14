import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_DIRECTORIES = ["src", "apps/web/src", "apps/mobile/src", "packages/core/src", "packages/platform/src", "packages/web-renderer/src", "packages/mobile-renderer/src", "shared", "functions/src", "tests", "scripts/dev", "scripts/verify"].map((directory) => path.join(ROOT_DIR, directory));
const ROOT_TEXT_FILES = ["tailwind.config.js", "postcss.config.js", "eslint.config.js", "vite.config.ts"].map((fileName) => path.join(ROOT_DIR, fileName));
const TEXT_EXTENSIONS = new Set([".cjs", ".css", ".html", ".js", ".jsx", ".json", ".md", ".mjs", ".scss", ".svg", ".ts", ".tsx", ".webmanifest", ".xml"]);
const EXCLUDED_PATH_PARTS = ["/node_modules/", "/dist/", "/build/", "/coverage/", "/.git/", "/.turbo/", "/target/"];
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
  ["data-[state=checked]:border-[oklch(0.205_0_0)]", "data-[state=checked]:border-neutral-900"],
  ["data-[state=checked]:bg-[oklch(0.205_0_0)]", "data-[state=checked]:bg-neutral-900"],
  ["data-[state=checked]:text-[oklch(0.985_0_0)]", "data-[state=checked]:text-neutral-50"],
  ["dark:data-[state=checked]:border-[oklch(0.922_0_0)]", "dark:data-[state=checked]:border-neutral-100"],
  ["dark:data-[state=checked]:bg-[oklch(0.922_0_0)]", "dark:data-[state=checked]:bg-neutral-100"],
  ["dark:data-[state=checked]:text-[oklch(0.205_0_0)]", "dark:data-[state=checked]:text-neutral-900"],
  ["text-[#007aff]", "text-blue-500"],
  ["text-[#111]", "text-neutral-950"],
  ["text-[#1c1c1e]", "text-zinc-900"],
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
  ["text-[#666]", "text-slate-600"],
  ["text-[#6b8294]", "text-slate-500"],
  ["text-[#6d8998]", "text-slate-500"],
  ["text-[#6e6e73]", "text-zinc-500"],
  ["text-[#7a756d]", "text-stone-500"],
  ["text-[#8e8e93]", "text-zinc-500"],
  ["text-[#8f929c]", "text-slate-500"],
  ["text-[#9a4d4d]", "text-red-700"],
  ["text-[#9aa0aa]", "text-slate-400"],
  ["text-[#a1a1aa]", "text-zinc-400"],
  ["text-[#b8b8b8]", "text-slate-400"],
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
  [17, "text-lg"],
  [18, "text-lg"],
  [20, "text-xl"],
  [22, "text-2xl"],
  [24, "text-2xl"],
]);
const SPACING_PREFIXES = ["min-w", "max-w", "min-h", "max-h", "inset-x", "inset-y", "size", "w", "h", "p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml", "top", "right", "bottom", "left"];
const SPACING_SCALE = [[1, "px"], [2, "0.5"], [4, "1"], [6, "1.5"], [8, "2"], [10, "2.5"], [12, "3"], [14, "3.5"], [16, "4"], [20, "5"], [24, "6"], [28, "7"], [32, "8"], [36, "9"], [40, "10"], [44, "11"], [48, "12"], [56, "14"], [64, "16"], [80, "20"], [96, "24"], [112, "28"], [128, "32"], [144, "36"], [160, "40"], [176, "44"], [192, "48"], [208, "52"], [224, "56"], [240, "60"], [256, "64"], [288, "72"], [320, "80"], [384, "96"]];
const SPACING_PATTERN = new RegExp(`(?<![\\w-])(${SPACING_PREFIXES.join("|")})-\\[(-?\\d+)px\\]`, "g");
const TEXT_SIZE_PATTERN = /(?<![\w-])text-\[(\d+)px\]/g;
const CLASS_TOKEN_PATTERN = /[^\s"'`{}<>]+/gu;
const ARBITRARY_VALUE_SEGMENT_PATTERN = /^!?-?[a-z][a-z0-9-]*-\[[^\]]+\]$/iu;

const toPosix = (value) => value.split(path.sep).join("/");
const getRelativePath = (filePath) => toPosix(path.relative(ROOT_DIR, filePath));
const isExcludedPath = (filePath) => {
  const relativePath = `/${getRelativePath(filePath)}`;
  return EXCLUDED_PATH_PARTS.some((part) => relativePath.includes(part));
};
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
    return [entryPath];
  });
};
const getExistingRootTextFiles = () => ROOT_TEXT_FILES.filter((filePath) => existsSync(filePath) && statSync(filePath).isFile() && isTextFile(filePath));
const getTextFiles = () => [...new Set([...SOURCE_DIRECTORIES.flatMap(walkTextFiles), ...getExistingRootTextFiles()])];
const findNearestSpacingToken = (pxValue) => {
  let nearest = SPACING_SCALE[0];
  for (const scaleEntry of SPACING_SCALE) {
    if (Math.abs(scaleEntry[0] - pxValue) < Math.abs(nearest[0] - pxValue)) nearest = scaleEntry;
  }
  return nearest[1];
};
const normalizeArbitrarySpacingClass = (_match, prefix, rawValue) => {
  const pxValue = Number(rawValue);
  const token = findNearestSpacingToken(Math.abs(pxValue));
  return pxValue < 0 ? `-${prefix}-${token}` : `${prefix}-${token}`;
};
const normalizeArbitraryTextSizeClass = (match, rawValue) => TEXT_SIZE_REPLACEMENTS.get(Number(rawValue)) ?? match;
const normalizeTailwindStandardClasses = (source) => {
  let nextSource = source;
  for (const [fromClassName, toClassName] of EXACT_CLASS_REPLACEMENTS) {
    nextSource = nextSource.split(fromClassName).join(toClassName);
  }
  nextSource = nextSource.replace(SPACING_PATTERN, normalizeArbitrarySpacingClass);
  nextSource = nextSource.replace(TEXT_SIZE_PATTERN, normalizeArbitraryTextSizeClass);
  return nextSource;
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
