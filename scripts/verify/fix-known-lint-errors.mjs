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
const PDF_DOCUMENT_SOURCE_RESOLUTION_CONFLICT_PATTERN = /<<<<<<< HEAD\nconst waitForPdfSourceResolution = async <T,>\(promise: Promise<T>\): Promise<T> => \{\n=======\n\nconst waitForPdfSourceResolution: PdfSourceResolutionWaiter = async \(promise\) => \{\n>>>>>>> [a-f0-9]+/u;
const PDF_DOCUMENT_SOURCE_RESOLUTION_REPLACEMENT = "const waitForPdfSourceResolution: PdfSourceResolutionWaiter = async (promise) => {";

const applyKnownLintFixes = (source) => {
  let nextSource = source;

  nextSource = nextSource.replace(PDF_DOCUMENT_SOURCE_RESOLUTION_CONFLICT_PATTERN, PDF_DOCUMENT_SOURCE_RESOLUTION_REPLACEMENT);
  nextSource = nextSource.replace(/type ChatMessage = UIMessage<\{}, MessageDataPart>;/u, "type ChatMessage = UIMessage<object, MessageDataPart>;");
  nextSource = nextSource.replace(/type StratisOptionalIconProps = \{ names: readonly string\[]; className\?: string; \};\n/u, "");
  nextSource = nextSource.replace(/type StratisOptionalIconProps = \{ names: readonly string\[]; className\?: string; active\?: boolean; \};\n/u, "");
  nextSource = nextSource.replace(/const StratisOptionalIcon = \(\{ names, className \}: StratisOptionalIconProps\) => \{\n  const Icon = resolveStratisIcon\(names\);\n  return Icon \? <Icon className=\{className\} aria-hidden="true" focusable="false" \/> : null;\n\};\n/u, "");
  nextSource = nextSource.replace(/const StratisOptionalIcon = \(\{ names, className, active = false \}: StratisOptionalIconProps\) => \{\n  const Icon = resolveStratisIcon\(names\);\n  return Icon \? <Icon className=\{className\} aria-hidden="true" focusable="false" \/> : <StratisFallbackBookmarkIcon className=\{className\} active=\{active\} \/>;\n\};\n/u, "");
  nextSource = nextSource.replace(/(const STRATIS_CHECK_ICON_NAMES = \[[^\n]+\]\s+as const;\nconst STRATIS_PLUS_ICON_NAMES = \[[^\n]+\]\s+as const;\nconst STRATIS_SETTINGS_ICON_NAMES = \[[^\n]+\]\s+as const;\n)/u, "$1const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);\nconst StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);\nconst StratisSettingsIcon = resolveStratisIcon(STRATIS_SETTINGS_ICON_NAMES);\n");
  nextSource = nextSource.replace(/(const STRATIS_CHECK_ICON_NAMES = \[[^\n]+\]\s+as const;\nconst STRATIS_PLUS_ICON_NAMES = \[[^\n]+\]\s+as const;\n)/u, "$1const StratisCheckIcon = resolveStratisIcon(STRATIS_CHECK_ICON_NAMES);\nconst StratisPlusIcon = resolveStratisIcon(STRATIS_PLUS_ICON_NAMES);\n");
  nextSource = nextSource.replace(/(const STRATIS_BOOKMARK_ICON_NAMES = \[[^\n]+\]\s+as const;\n)/u, "$1const StratisBookmarkIcon = resolveStratisIcon(STRATIS_BOOKMARK_ICON_NAMES);\n");
  nextSource = nextSource.replace(/\{selected \? <StratisOptionalIcon names=\{STRATIS_CHECK_ICON_NAMES\} className="h-4 w-4" \/> : null\}/u, "{selected && StratisCheckIcon ? <StratisCheckIcon className=\"h-4 w-4\" aria-hidden=\"true\" focusable=\"false\" /> : null}");
  nextSource = nextSource.replace(/<StratisOptionalIcon names=\{STRATIS_SETTINGS_ICON_NAMES\} className=\{cn\(isCompact \? "h-3\.5 w-3\.5" : "h-4 w-4"\)\} \/>/u, "{StratisSettingsIcon ? <StratisSettingsIcon className={cn(isCompact ? \"h-3.5 w-3.5\" : \"h-4 w-4\")} aria-hidden=\"true\" focusable=\"false\" /> : null}");
  nextSource = nextSource.replace(/<StratisOptionalIcon names=\{STRATIS_PLUS_ICON_NAMES\} className="h-5 w-5" \/>/u, "{StratisPlusIcon ? <StratisPlusIcon className=\"h-5 w-5\" aria-hidden=\"true\" focusable=\"false\" /> : null}");
  nextSource = nextSource.replace(/\{isActive \? <StratisOptionalIcon names=\{STRATIS_CHECK_ICON_NAMES\} className="h-3 w-3 text-\[#8e8e93\]" \/> : null\}/u, "{isActive && StratisCheckIcon ? <StratisCheckIcon className=\"h-3 w-3 text-[#8e8e93]\" aria-hidden=\"true\" focusable=\"false\" /> : null}");
  nextSource = nextSource.replace(/<StratisOptionalIcon names=\{STRATIS_PLUS_ICON_NAMES\} className="h-7 w-7" \/>/u, "{StratisPlusIcon ? <StratisPlusIcon className=\"h-7 w-7\" aria-hidden=\"true\" focusable=\"false\" /> : null}");
  nextSource = nextSource.replace(/<StratisOptionalIcon names=\{STRATIS_BOOKMARK_ICON_NAMES\} active=\{toolbarState\.isBookmarked\} className=\{cn\("h-4 w-4", toolbarState\.isBookmarked \? "fill-current" : "fill-none"\)\} \/>/u, "{StratisBookmarkIcon ? <StratisBookmarkIcon className={cn(\"h-4 w-4\", toolbarState.isBookmarked ? \"fill-current\" : \"fill-none\")} aria-hidden=\"true\" focusable=\"false\" /> : <StratisFallbackBookmarkIcon className={cn(\"h-4 w-4\", toolbarState.isBookmarked ? \"fill-current\" : \"fill-none\")} active={toolbarState.isBookmarked} />}");

  return nextSource;
};

const updateFile = (filePath) => {
  if (!existsSync(filePath)) return false;

  const originalSource = readFileSync(filePath, "utf8");
  const nextSource = applyKnownLintFixes(originalSource);

  if (nextSource === originalSource) return false;

  writeFileSync(filePath, nextSource);
  return true;
};

const updatedFiles = TARGET_FILE_PATHS.filter(updateFile);

if (updatedFiles.length > 0) {
  console.log(`既知 lint エラーの自動修正を ${updatedFiles.length} file(s) 適用しました。`);
}
