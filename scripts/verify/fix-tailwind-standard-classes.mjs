import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "../..");
const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".turbo",
  "coverage",
  "dist",
  "build",
  "node_modules",
]);
const SKIPPED_FILES = new Set([
  path.resolve(SCRIPT_DIR, "fix-tailwind-standard-classes.mjs"),
]);
const TEXT_FILE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".cts",
  ".html",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);
const EXACT_CLASS_REPLACEMENTS = [
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
  ["shadow-[0_8px_24px_rgba(15,23,42,0.06)]", "shadow-lg"],
  ["shadow-[0_10px_30px_rgba(15,23,42,0.06)]", "shadow-xl"],
  ["shadow-[0_14px_34px_rgba(74,90,110,0.16),inset_0_1px_0_rgba(255,255,255,0.9)]", "shadow-xl"],
  ["shadow-[0_0_0_3px_rgba(255,255,255,0.72)]", "ring-2 ring-white/70"],
  ["leading-[1.7]", "leading-7"],
  ["tracking-[-0.01em]", "tracking-tight"],
  ["tracking-[-0.02em]", "tracking-tight"],
  ["tracking-[-0.03em]", "tracking-tight"],
  ["font-[450]", "font-medium"],
  ["border-[#eee]", "border-slate-200"],
  ["border-[#dddcd5]", "border-stone-300"],
  ["border-[#d8d4ca]", "border-stone-300"],
  ["border-[rgba(0,0,0,0.12)]", "border-black/10"],
  ["ring-[#dedede]", "ring-slate-200"],
  ["focus-visible:ring-[#8db9ff]/40", "focus-visible:ring-blue-300/40"],
  ["focus:border-[#b9b1a2]", "focus:border-stone-400"],
  ["bg-[#eee]", "bg-slate-100"],
  ["bg-[#f7f7f7]", "bg-zinc-100"],
  ["bg-[#f7f5ef]", "bg-stone-50"],
  ["bg-[#fbfaf7]", "bg-stone-50"],
  ["bg-[#24211d]", "bg-stone-900"],
  ["bg-[#f2f7fb]/90", "bg-sky-50/90"],
  ["bg-[rgba(255,255,255,0.84)]", "bg-white/85"],
  ["hover:bg-[#fafafa]", "hover:bg-slate-50"],
  ["hover:bg-[#f6eeee]", "hover:bg-red-50"],
  ["hover:bg-[#3a352f]", "hover:bg-stone-700"],
  ["data-[state=checked]:border-[oklch(0.205_0_0)]", "data-[state=checked]:border-neutral-900"],
  ["data-[state=checked]:bg-[oklch(0.205_0_0)]", "data-[state=checked]:bg-neutral-900"],
  ["data-[state=checked]:text-[oklch(0.985_0_0)]", "data-[state=checked]:text-neutral-50"],
  ["dark:data-[state=checked]:border-[oklch(0.922_0_0)]", "dark:data-[state=checked]:border-neutral-100"],
  ["dark:data-[state=checked]:bg-[oklch(0.922_0_0)]", "dark:data-[state=checked]:bg-neutral-100"],
  ["dark:data-[state=checked]:text-[oklch(0.205_0_0)]", "dark:data-[state=checked]:text-neutral-900"],
  ["text-[#007aff]", "text-blue-500"],
  ["text-[#24211d]", "text-stone-900"],
  ["text-[#3a3a3c]", "text-slate-700"],
  ["text-[#3f3f3f]", "text-slate-700"],
  ["text-[#405162]", "text-slate-600"],
  ["text-[#46515f]", "text-slate-600"],
  ["text-[#4a4a4a]", "text-neutral-600"],
  ["text-[#52616f]", "text-slate-600"],
  ["text-[#5f5a52]", "text-stone-600"],
  ["text-[#666]", "text-slate-600"],
  ["text-[#6b8294]", "text-slate-500"],
  ["text-[#7a756d]", "text-stone-500"],
  ["text-[#8e8e93]", "text-zinc-500"],
  ["text-[#8f929c]", "text-slate-500"],
  ["text-[#9a4d4d]", "text-red-700"],
  ["text-[#9aa0aa]", "text-slate-400"],
  ["text-[#b8b8b8]", "text-slate-400"],
  ["hover:text-[#4c5361]", "hover:text-slate-600"],
];
const TEXT_SIZE_REPLACEMENTS = new Map([
  [10, "text-xs"],
  [11, "text-xs"],
  [12, "text-xs"],
  [13, "text-xs"],
  [14, "text-sm"],
  [15, "text-sm"],
  [16, "text-base"],
  [18, "text-lg"],
  [20, "text-xl"],
  [22, "text-2xl"],
  [24, "text-2xl"],
]);
const SPACING_PREFIXES = [
  "min-w",
  "max-w",
  "min-h",
  "max-h",
  "inset-x",
  "inset-y",
  "size",
  "w",
  "h",
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "top",
  "right",
  "bottom",
  "left",
];
const SPACING_SCALE = [
  [1, "px"],
  [2, "0.5"],
  [4, "1"],
  [6, "1.5"],
  [8, "2"],
  [10, "2.5"],
  [12, "3"],
  [14, "3.5"],
  [16, "4"],
  [20, "5"],
  [24, "6"],
  [28, "7"],
  [32, "8"],
  [36, "9"],
  [40, "10"],
  [44, "11"],
  [48, "12"],
  [56, "14"],
  [64, "16"],
  [80, "20"],
  [96, "24"],
  [112, "28"],
  [128, "32"],
  [144, "36"],
  [160, "40"],
  [176, "44"],
  [192, "48"],
  [208, "52"],
  [224, "56"],
  [240, "60"],
  [256, "64"],
  [288, "72"],
  [320, "80"],
  [384, "96"],
];
const SPACING_PATTERN = new RegExp(`(?<![\\w-])(${SPACING_PREFIXES.join("|")})-\\[(-?\\d+)px\\]`, "g");
const TEXT_SIZE_PATTERN = /(?<![\w-])text-\[(\d+)px\]/g;
const REPOSITORY_RELATIVE_PREFIX = `${REPOSITORY_ROOT}${path.sep}`;

const getRelativePath = (filePath) => filePath.startsWith(REPOSITORY_RELATIVE_PREFIX) ? filePath.slice(REPOSITORY_RELATIVE_PREFIX.length) : filePath;
const shouldVisitDirectory = (directoryPath) => !SKIPPED_DIRECTORIES.has(path.basename(directoryPath));
const isTextFile = (filePath) => TEXT_FILE_EXTENSIONS.has(path.extname(filePath));
const shouldProcessFile = (filePath) => !SKIPPED_FILES.has(filePath);
const getTextFiles = (directoryPath = REPOSITORY_ROOT) => {
  const files = [];
  for (const entry of readdirSync(directoryPath)) {
    const entryPath = path.join(directoryPath, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      if (shouldVisitDirectory(entryPath)) files.push(...getTextFiles(entryPath));
      continue;
    }
    if (stats.isFile() && isTextFile(entryPath) && shouldProcessFile(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
};
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

const changedFiles = [];
for (const filePath of getTextFiles()) {
  const source = readFileSync(filePath, "utf8");
  const nextSource = normalizeTailwindStandardClasses(source);
  if (source === nextSource) continue;
  writeFileSync(filePath, nextSource);
  changedFiles.push(getRelativePath(filePath));
}
if (changedFiles.length === 0) {
  console.log("Tailwind 任意値クラスの標準化対象はありません。");
} else {
  console.log(`Tailwind 任意値クラスを ${changedFiles.length} 件のファイルで標準クラスへ寄せました。`);
}
