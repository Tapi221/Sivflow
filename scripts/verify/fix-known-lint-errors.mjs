import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const TARGET_FILE_PATHS = [
  "src/features/calendar/timetable/CalendarTimetableView.tsx",
  "src/features/pdf/PdfDocumentPane.tsx",
  "src/features/pdf/PdfPane.tsx",
  "src/pane.desktop/view/ScheduleScreen.mobile.tsx",
  "src/components/editor/use-chat.ts",
].map((filePath) => path.join(ROOT_DIR, filePath));
const RESOLVE_STRATIS_ICON_DECLARATION_PATTERN = /^const resolveStratisIcon = \(names: readonly string\[\]\): StratisIconComponent \| null => .*;$/mu;
const CALENDAR_TIMETABLE_ICON_DECLARATIONS = "const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);\nconst StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);\nconst StratisSettingsIcon = resolveStratisIcon(STRATIS_SETTINGS_ICON_NAMES);\n";
const SCHEDULE_SCREEN_ICON_DECLARATIONS = "const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);\nconst StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);\n";
const PDF_PANE_ICON_DECLARATIONS = "const StratisBookmarkIcon = resolveStratisIcon(STRATIS_BOOKMARK_ICON_NAMES);\n";
const PDF_DOCUMENT_SOURCE_RESOLUTION_REPLACEMENT = "const waitForPdfSourceResolution: PdfSourceResolutionWaiter = async (promise) => {";

const normalizeLineEndings = (source) => source.split("\r\n").join("\n").split("\r").join("\n");

const replaceAll = (source, searchValue, replaceValue) => source.split(searchValue).join(replaceValue);

const removeBlock = (source, startText) => {
  const startIndex = source.indexOf(startText);
  if (startIndex === -1) return source;

  const endIndex = source.indexOf("\n};\n", startIndex);
  if (endIndex === -1) return source;

  return `${source.slice(0, startIndex)}${source.slice(endIndex + "\n};\n".length)}`;
};

const insertAfterResolveStratisIcon = (source, declarations) => {
  if (source.includes(declarations.trim())) return source;
  const match = source.match(RESOLVE_STRATIS_ICON_DECLARATION_PATTERN);
  if (!match || match.index === undefined) return source;

  const insertIndex = match.index + match[0].length;
  return `${source.slice(0, insertIndex)}\n${declarations}${source.slice(insertIndex + (source[insertIndex] === "\n" ? 1 : 0))}`;
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
  const normalizedSource = normalizeLineEndings(source);

  if (relativePath === "src/features/calendar/timetable/CalendarTimetableView.tsx") return applyCalendarTimetableFixes(normalizedSource);
  if (relativePath === "src/features/pdf/PdfDocumentPane.tsx") return applyPdfDocumentPaneFixes(normalizedSource);
  if (relativePath === "src/features/pdf/PdfPane.tsx") return applyPdfPaneFixes(normalizedSource);
  if (relativePath === "src/pane.desktop/view/ScheduleScreen.mobile.tsx") return applyScheduleScreenFixes(normalizedSource);
  if (relativePath === "src/components/editor/use-chat.ts") return applyUseChatFixes(normalizedSource);

  return normalizedSource;
};

const updateFile = (filePath) => {
  if (!existsSync(filePath)) return false;

  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applyKnownLintFixes(filePath, originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = TARGET_FILE_PATHS.filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`既知 lint エラーの自動修正を ${updatedFiles.length} file(s) 適用しました。`);
}
