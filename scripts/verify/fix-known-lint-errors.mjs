import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const DEFAULT_TARGET_FILE_PATHS = [
  "src/features/calendar/timetable/CalendarTimetableView.tsx",
  "src/features/pdf/PdfDocumentPane.tsx",
  "src/features/pdf/PdfPane.tsx",
  "src/pane.desktop/view/ScheduleScreen.mobile.tsx",
  "src/components/editor/use-chat.ts",
  "src/features/library-cardset/model/cardSetLibraryRow.ts",
  "src/features/library-pdf/components/PdfLibraryDashboard.tsx",
  "src/features/library-pdf/model/pdfLibraryRow.ts",
].map((filePath) => path.join(ROOT_DIR, filePath));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const SIMPLE_MEMBER_EXPRESSION_PATTERN = String.raw`[A-Za-z_$][\w$]*(?:\?\.[A-Za-z_$][\w$]*|\.[A-Za-z_$][\w$]*|\[[^\]\n]+\])*`;
const NUMBER_NULLISH_ZERO_PATTERN = new RegExp(String.raw`Number\((${SIMPLE_MEMBER_EXPRESSION_PATTERN})\) \?\? 0`, "gu");
const JOIN_NULLISH_FALLBACK_PATTERN = new RegExp(String.raw`(${SIMPLE_MEMBER_EXPRESSION_PATTERN})\.join\(([^()\n]*)\) \?\? ("[^"\n]*"|'[^'\n]*')`, "gu");
const RESOLVE_STRATIS_ICON_DECLARATION_PATTERN = /^const resolveStratisIcon = \(names: readonly string\[\]\): StratisIconComponent \| null => .*;$/mu;
const STRATIS_ICON_DECLARATION_PATTERN = /^const Stratis(?:Bookmark|Check|Plus|Settings)Icon = resolveStratisIcon\(STRATIS_(?:BOOKMARK|CHECK|PLUS|SETTINGS)_ICON_NAMES\);\n?/gmu;
const CALENDAR_TIMETABLE_ICON_DECLARATIONS = "const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);\nconst StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);\nconst StratisSettingsIcon = resolveStratisIcon(STRATIS_SETTINGS_ICON_NAMES);\n";
const SCHEDULE_SCREEN_ICON_DECLARATIONS = "const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);\nconst StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);\n";
const PDF_PANE_ICON_DECLARATIONS = "const StratisBookmarkIcon = resolveStratisIcon(STRATIS_BOOKMARK_ICON_NAMES);\n";
const PDF_DOCUMENT_SOURCE_RESOLUTION_REPLACEMENT = "const waitForPdfSourceResolution: PdfSourceResolutionWaiter = async (promise) => {";

const normalizeLineEndings = (source) => source.split("\r\n").join("\n").split("\r").join("\n");

const replaceAll = (source, searchValue, replaceValue) => source.split(searchValue).join(replaceValue);

const toAbsolutePath = (filePath) => path.isAbsolute(filePath) ? filePath : path.join(ROOT_DIR, filePath);

const walkTargetFiles = (targetPath) => {
  if (!existsSync(targetPath)) return [];

  const stat = statSync(targetPath);
  if (stat.isFile()) return SOURCE_EXTENSIONS.has(path.extname(targetPath)) ? [targetPath] : [];
  if (!stat.isDirectory()) return [];

  return readdirSync(targetPath).flatMap((entry) => walkTargetFiles(path.join(targetPath, entry)));
};

const getTargetFilePaths = () => {
  const targetValue = process.env.SOURCE_CONVENTION_TARGETS;
  if (!targetValue) return DEFAULT_TARGET_FILE_PATHS;

  return targetValue
    .split(path.delimiter)
    .map((targetPath) => targetPath.trim())
    .filter(Boolean)
    .map(toAbsolutePath)
    .flatMap(walkTargetFiles);
};

const removeBlock = (source, startText) => {
  const startIndex = source.indexOf(startText);
  if (startIndex === -1) return source;

  const endIndex = source.indexOf("\n};\n", startIndex);
  if (endIndex === -1) return source;

  return `${source.slice(0, startIndex)}${source.slice(endIndex + "\n};\n".length)}`;
};

const removeStratisIconDeclarations = (source) => source.replace(STRATIS_ICON_DECLARATION_PATTERN, "");

const insertAfterResolveStratisIcon = (source, declarations) => {
  const sourceWithoutDeclarations = removeStratisIconDeclarations(source);
  const match = sourceWithoutDeclarations.match(RESOLVE_STRATIS_ICON_DECLARATION_PATTERN);
  if (!match || match.index === undefined) return sourceWithoutDeclarations;

  const insertIndex = match.index + match[0].length;
  return `${sourceWithoutDeclarations.slice(0, insertIndex)}\n${declarations}${sourceWithoutDeclarations.slice(insertIndex + (sourceWithoutDeclarations[insertIndex] === "\n" ? 1 : 0))}`;
};

const applyNoConstantBinaryExpressionFixes = (source) => {
  let nextSource = source;
  nextSource = nextSource.replace(NUMBER_NULLISH_ZERO_PATTERN, (_match, valueExpression) => `Number.isFinite(Number(${valueExpression})) ? Number(${valueExpression}) : 0`);
  nextSource = nextSource.replace(JOIN_NULLISH_FALLBACK_PATTERN, (_match, arrayExpression, separatorExpression, fallbackExpression) => `${arrayExpression}.length > 0 ? ${arrayExpression}.join(${separatorExpression}) : ${fallbackExpression}`);

  return nextSource;
};

const applyPdfDocumentPaneFixes = (source) => {
  const conflictStart = source.indexOf("<<<<<<< HEAD");
  if (conflictStart === -1) return source;
  if (!source.slice(conflictStart).includes("waitForPdfSourceResolution")) return source;

  const conflictMarkerStart = source.indexOf("\n>>>>>>>", conflictStart);
  if (conflictMarkerStart === -1) return source;

  const conflictEnd = source.indexOf("\n", conflictMarkerStart + 1);
  if (conflictEnd === -1) return source;

  return `${source.slice(0, conflictStart)}${PDF_DOCUMENT_SOURCE_RESOLUTION_REPLACEMENT}${source.slice(conflictEnd)}`;
};

const applyUseChatFixes = (source) => source.replace("type ChatMessage = UIMessage<{}, MessageDataPart>;", "type ChatMessage = UIMessage<object, MessageDataPart>;");

const removeStratisOptionalIcon = (source) => {
  let nextSource = source;
  nextSource = replaceAll(nextSource, "type StratisOptionalIconProps = { names: readonly string[]; className?: string; };\n", "");
  nextSource = replaceAll(nextSource, "type StratisOptionalIconProps = { names: readonly string[]; className?: string; active?: boolean; };\n", "");
  nextSource = removeBlock(nextSource, "const StratisOptionalIcon = ({ names, className }: StratisOptionalIconProps) => {");
  nextSource = removeBlock(nextSource, "const StratisOptionalIcon = ({ names, className, active = false }: StratisOptionalIconProps) => {");

  return nextSource;
};

const applyCalendarTimetableFixes = (source) => {
  let nextSource = removeStratisOptionalIcon(source);
  nextSource = insertAfterResolveStratisIcon(nextSource, CALENDAR_TIMETABLE_ICON_DECLARATIONS);
  nextSource = replaceAll(nextSource, "{selected ? <StratisOptionalIcon names={STRATIS_CHECK_ICON_NAMES} className=\"h-4 w-4\" /> : null}", "{selected && StratisCheckIcon ? <StratisCheckIcon className=\"h-4 w-4\" aria-hidden=\"true\" focusable=\"false\" /> : null}");
  nextSource = replaceAll(nextSource, "<StratisOptionalIcon names={STRATIS_SETTINGS_ICON_NAMES} className={cn(isCompact ? \"h-3.5 w-3.5\" : \"h-4 w-4\")} />", "{StratisSettingsIcon ? <StratisSettingsIcon className={cn(isCompact ? \"h-3.5 w-3.5\" : \"h-4 w-4\")} aria-hidden=\"true\" focusable=\"false\" /> : null}");
  nextSource = replaceAll(nextSource, "<StratisOptionalIcon names={STRATIS_PLUS_ICON_NAMES} className=\"h-5 w-5\" />", "{StratisPlusIcon ? <StratisPlusIcon className=\"h-5 w-5\" aria-hidden=\"true\" focusable=\"false\" /> : null}");

  return nextSource;
};

const applyScheduleScreenFixes = (source) => {
  let nextSource = removeStratisOptionalIcon(source);
  nextSource = insertAfterResolveStratisIcon(nextSource, SCHEDULE_SCREEN_ICON_DECLARATIONS);
  nextSource = replaceAll(nextSource, "{isActive ? <StratisOptionalIcon names={STRATIS_CHECK_ICON_NAMES} className=\"h-3 w-3 text-[#8e8e93]\" /> : null}", "{isActive && StratisCheckIcon ? <StratisCheckIcon className=\"h-3 w-3 text-[#8e8e93]\" aria-hidden=\"true\" focusable=\"false\" /> : null}");
  nextSource = replaceAll(nextSource, "<StratisOptionalIcon names={STRATIS_PLUS_ICON_NAMES} className=\"h-7 w-7\" />", "{StratisPlusIcon ? <StratisPlusIcon className=\"h-7 w-7\" aria-hidden=\"true\" focusable=\"false\" /> : null}");

  return nextSource;
};

const applyPdfPaneFixes = (source) => {
  let nextSource = removeStratisOptionalIcon(source);
  nextSource = insertAfterResolveStratisIcon(nextSource, PDF_PANE_ICON_DECLARATIONS);
  nextSource = replaceAll(nextSource, "<StratisOptionalIcon names={STRATIS_BOOKMARK_ICON_NAMES} active={toolbarState.isBookmarked} className={cn(\"h-4 w-4\", toolbarState.isBookmarked ? \"fill-current\" : \"fill-none\")} />", "{StratisBookmarkIcon ? <StratisBookmarkIcon className={cn(\"h-4 w-4\", toolbarState.isBookmarked ? \"fill-current\" : \"fill-none\")} aria-hidden=\"true\" focusable=\"false\" /> : <StratisFallbackBookmarkIcon className={cn(\"h-4 w-4\", toolbarState.isBookmarked ? \"fill-current\" : \"fill-none\")} active={toolbarState.isBookmarked} />}");

  return nextSource;
};

const applyKnownLintFixes = (filePath, source) => {
  const relativePath = path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
  let nextSource = normalizeLineEndings(source);
  nextSource = applyNoConstantBinaryExpressionFixes(nextSource);

  if (relativePath === "src/features/calendar/timetable/CalendarTimetableView.tsx") return applyCalendarTimetableFixes(nextSource);
  if (relativePath === "src/features/pdf/PdfDocumentPane.tsx") return applyPdfDocumentPaneFixes(nextSource);
  if (relativePath === "src/features/pdf/PdfPane.tsx") return applyPdfPaneFixes(nextSource);
  if (relativePath === "src/pane.desktop/view/ScheduleScreen.mobile.tsx") return applyScheduleScreenFixes(nextSource);
  if (relativePath === "src/components/editor/use-chat.ts") return applyUseChatFixes(nextSource);

  return nextSource;
};

const updateFile = (filePath) => {
  if (!existsSync(filePath)) return false;

  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applyKnownLintFixes(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = getTargetFilePaths().filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`既知 lint エラーの自動修正を ${updatedFiles.length} file(s) 適用しました。`);
}
