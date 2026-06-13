type ImportSheetName = "blocks";
type ImportColumnKey =
  | "cardId"
  | "side"
  | "blockOrder"
  | "type"
  | "content"
  | "language"
  | "image"
  | "title"
  | "note";
type ImportBlockType = "text" | "markdown" | "math" | "code" | "image";
type ImportSide = "front" | "back";
type ImportBlock = {
  type: ImportBlockType;
  order: number;
  content?: string;
  language?: string;
};
type ImportCard = {
  cardId: string;
  title?: string;
  frontBlocks: ImportBlock[];
  backBlocks: ImportBlock[];
};
type ImportPayload = {
  version: 1;
  source: "xlsx";
  cards: ImportCard[];
};
type ImportIssueLevel = "error" | "warning";
type ImportIssueCode =
  | "missing_sheet"
  | "missing_required_header"
  | "missing_required_cell"
  | "invalid_type"
  | "invalid_side"
  | "invalid_block_order"
  | "duplicate_block_order"
  | "empty_content"
  | "mixed_title_in_same_card"
  | "unsupported_image_cell"
  | "unexpected_value";
type ImportIssue = {
  level: ImportIssueLevel;
  code: ImportIssueCode;
  sheetName: string;
  rowNumber?: number;
  columnKey?: ImportColumnKey;
  message: string;
};
type ImportParseResult = {
  payload: ImportPayload | null;
  issues: ImportIssue[];
};
type ParsedImportRow = {
  sheetName: ImportSheetName;
  rowNumber: number;
  cardId: string;
  side: ImportSide;
  title?: string;
  block: ImportBlock;
};



const IMPORT_SHEET_NAME: ImportSheetName = "blocks";
const IMPORT_BLOCK_TYPES: ImportBlockType[] = [
  "text",
  "markdown",
  "math",
  "code",
  "image",
];
const IMPORT_SIDES: ImportSide[] = ["front", "back"];



const isImportBlockType = (value: string): value is ImportBlockType => {
  return IMPORT_BLOCK_TYPES.includes(value as ImportBlockType);
};
const isImportSide = (value: string): value is ImportSide => {
  return IMPORT_SIDES.includes(value as ImportSide);
};
const formatImportCellLabel = (issue: ImportIssue) => {
  const locationParts = [issue.sheetName];

  if (typeof issue.rowNumber === "number") {
    locationParts.push(String(issue.rowNumber));
  }

  if (issue.columnKey) {
    locationParts.push(issue.columnKey);
  }

  return locationParts.join(":");
};
const hasImportBlockingError = (result: ImportParseResult | null) => {
  if (!result) return true;
  return result.issues.some((issue) => issue.level === "error");
};



export { IMPORT_BLOCK_TYPES, IMPORT_SHEET_NAME, IMPORT_SIDES, formatImportCellLabel, hasImportBlockingError, isImportBlockType, isImportSide };


export type { ImportBlock, ImportBlockType, ImportCard, ImportColumnKey, ImportIssue, ImportIssueCode, ImportIssueLevel, ImportParseResult, ImportPayload, ImportSheetName, ImportSide, ParsedImportRow };
