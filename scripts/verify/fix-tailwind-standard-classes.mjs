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
  ["rounded", "rounded"],
  ["rounded-md", "rounded-md"],
  ["rounded-lg", "rounded-lg"],
  ["rounded-lg", "rounded-lg"],
  ["rounded-xl", "rounded-xl"],
  ["rounded-xl", "rounded-xl"],
  ["rounded-xl", "rounded-xl"],
  ["rounded-2xl", "rounded-2xl"],
  ["rounded-2xl", "rounded-2xl"],
  ["rounded-2xl", "rounded-2xl"],
  ["rounded-3xl", "rounded-3xl"],
  ["rounded-3xl", "rounded-3xl"],
  ["shadow-sm", "shadow-sm"],
  ["shadow-lg", "shadow-lg"],
  ["shadow-lg", "shadow-lg"],
  ["shadow-xl", "shadow-xl"],
  ["shadow-xl", "shadow-xl"],
  ["ring-2 ring-white/70", "ring-2 ring-white/70"],
  ["leading-7", "leading-7"],
  ["tracking-tight", "tracking-tight"],
  ["tracking-tight", "tracking-tight"],
  ["tracking-tight", "tracking-tight"],
  ["font-medium", "font-medium"],
  ["border-slate-200", "border-slate-200"],
  ["border-stone-300", "border-stone-300"],
  ["border-stone-300", "border-stone-300"],
  ["border-black/10", "border-black/10"],
  ["ring-slate-200", "ring-slate-200"],
  ["focus-visible:ring-blue-300/40", "focus-visible:ring-blue-300/40"],
  ["focus:border-stone-400", "focus:border-stone-400"],
  ["bg-slate-100", "bg-slate-100"],
  ["bg-zinc-100", "bg-zinc-100"],
  ["bg-stone-50", "bg-stone-50"],
  ["bg-stone-50", "bg-stone-50"],
  ["bg-stone-900", "bg-stone-900"],
  ["bg-sky-50/90", "bg-sky-50/90"],
  ["bg-white/85", "bg-white/85"],
  ["hover:bg-slate-50", "hover:bg-slate-50"],
  ["hover:bg-red-50", "hover:bg-red-50"],
  ["hover:bg-stone-700", "hover:bg-stone-700"],
  ["data-[state=checked]:border-neutral-900", "data-[state=checked]:border-neutral-900"],
  ["data-[state=checked]:bg-neutral-900", "data-[state=checked]:bg-neutral-900"],
  ["data-[state=checked]:text-neutral-50", "data-[state=checked]:text-neutral-50"],
  ["dark:data-[state=checked]:border-neutral-100", "dark:data-[state=checked]:border-neutral-100"],
  ["dark:data-[state=checked]:bg-neutral-100", "dark:data-[state=checked]:bg-neutral-100"],
  ["dark:data-[state=checked]:text-neutral-900", "dark:data-[state=checked]:text-neutral-900"],
  ["text-blue-500", "text-blue-500"],
  ["text-stone-900", "text-stone-900"],
  ["text-slate-700", "text-slate-700"],
  ["text-slate-700", "text-slate-700"],
  ["text-slate-600", "text-slate-600"],
  ["text-slate-600", "text-slate-600"],
  ["text-neutral-600", "text-neutral-600"],
  ["text-slate-600", "text-slate-600"],
  ["text-stone-600", "text-stone-600"],
  ["text-slate-600", "text-slate-600"],
  ["text-slate-500", "text-slate-500"],
  ["text-stone-500", "text-stone-500"],
  ["text-zinc-500", "text-zinc-500"],
  ["text-slate-500", "text-slate-500"],
  ["text-red-700", "text-red-700"],
  ["text-slate-400", "text-slate-400"],
  ["text-slate-400", "text-slate-400"],
  ["hover:text-slate-600", "hover:text-slate-600"],
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
const getTextFiles = (directoryPath = REPOSITORY_ROOT) => {
  const files = [];
  for (const entry of readdirSync(directoryPath)) {
    const entryPath = path.join(directoryPath, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      if (shouldVisitDirectory(entryPath)) files.push(...getTextFiles(entryPath));
      continue;
    }
    if (stats.isFile() && isTextFile(entryPath)) files.push(entryPath);
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
