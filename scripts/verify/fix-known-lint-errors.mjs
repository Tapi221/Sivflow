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
const RESOLVE_STRATIS_ICON_DECLARATION = "const resolveStratisIcon = (names: readonly string[]): StratisIconComponent | null => names.map((name) => STRATIS_ICON_COMPONENTS[name]).find((Icon): Icon is StratisIconComponent => Boolean(Icon)) ?? null;\n";
const CALENDAR_TIMETABLE_ICON_DECLARATIONS = "const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);\nconst StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);\nconst StratisSettingsIcon = resolveStratisIcon(STRATIS_SETTINGS_ICON_NAMES);\n";
const SCHEDULE_SCREEN_ICON_DECLARATIONS = "const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);\nconst StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);\n";
const PDF_PANE_ICON_DECLARATIONS = "const StratisBookmarkIcon = resolveStratisIcon(STRATIS_BOOKMARK_ICON_NAMES);\n";
const PDF_DOCUMENT_SOURCE_RESOLUTION_REPLACEMENT = "const waitForPdfSourceResolution: PdfSourceResolutionWaiter = async (promise) => {";

const replaceAll = (source, searchValue, replaceValue) => source.split(searchValue).join(replaceValue);

const insertAfterResolveStratisIcon = (source, declarations) => {
  if (source.includes(declarations.trim())) return source;
  if (!source.includes(RESOLVE_STRATIS_ICON_DECLARATION)) return source;

  return source.replace(RESOLVE_STRATIS_ICON_DECLARATION, `${RESOLVE_STRATIS_ICON_DECLARATION}${declarations}`);
};

const applyPdfDocumentPaneFixes = (source) => {
  const conflictStart = source.indexOf("<<<<<<< HEAD\nconst waitForPdfSourceResolution = async <T,>(promise: Promise<T>): Promise<T> => {\n=======\n\nconst waitForPdfSourceResolution: PdfSourceResolutionWaiter = async (promise) => {\n>>>>>>>");
  if (conflictStart === -1) return source;

  const conflictEnd = source.indexOf("\n", source.indexOf(">>>>>>>", conflictStart));
  if (conflictEnd === -1) return source;

  return `${source.slice(0, conflictStart)}${PDF_DOCUMENT_SOURCE_RESOLUTION_REPLACEMENT}${source.slice(conflictEnd)}`;
};

const applyUseChatFixes = (source) => source.replace("type ChatMessage = UIMessage<{}, MessageDataPart>;", "type ChatMessage = UIMessage<object, MessageDataPart>;");

const removeStratisOptionalIcon = (source) => {
  let nextSource = source;
  nextSource = nextSource.replace("type StratisOptionalIconProps = { names: readonly string[]; className?: string; };\n", "");
  nextSource = nextSource.replace("type StratisOptionalIconProps = { names: readonly string[]; className?: string; active?: boolean; };\n", "");
  nextSource = nextSource.replace("const StratisOptionalIcon = ({ names, className }: StratisOptionalIconProps) => {\n  const Icon = resolveStratisIcon(names);\n  return Icon ? <Icon className={className} aria-hidden=\"true\" focusable=\"false\" /> : null;\n};\n", "");
  nextSource = nextSource.replace("const StratisOptionalIcon = ({ names, className, active = false }: StratisOptionalIconProps) => {\n  const Icon = resolveStratisIcon(names);\n  return Icon ? <Icon className={className} aria-hidden=\"true\" focusable=\"false\" /> : <StratisFallbackBookmarkIcon className={className} active={active} />;\n};\n", "");

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

  if (relativePath === "src/features/calendar/timetable/CalendarTimetableView.tsx") return applyCalendarTimetableFixes(source);
  if (relativePath === "src/features/pdf/PdfDocumentPane.tsx") return applyPdfDocumentPaneFixes(source);
  if (relativePath === "src/features/pdf/PdfPane.tsx") return applyPdfPaneFixes(source);
  if (relativePath === "src/pane.desktop/view/ScheduleScreen.mobile.tsx") return applyScheduleScreenFixes(source);
  if (relativePath === "src/components/editor/use-chat.ts") return applyUseChatFixes(source);

  return source;
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
