export type ImportSheetName = "blocks";

export type ImportColumnKey =
  | "cardId"
  | "blockOrder"
  | "type"
  | "content"
  | "language"
  | "image"
  | "title"
  | "note";

export type ImportBlockType = "text" | "markdown" | "math" | "code" | "image";

export type ImportBlock = {
  type: ImportBlockType;
  order: number;
  content?: string;
  language?: string;
};

export type ImportCard = {
  cardId: string;
  title?: string;
  blocks: ImportBlock[];
};

export type ImportPayload = {
  version: 1;
  source: "xlsx";
  cards: ImportCard[];
};

export type ImportIssueLevel = "error" | "warning";

export type ImportIssueCode =
  | "missing_sheet"
  | "missing_required_header"
  | "missing_required_cell"
  | "invalid_type"
  | "invalid_block_order"
  | "duplicate_block_order"
  | "empty_content"
  | "mixed_title_in_same_card"
  | "unsupported_image_cell"
  | "unexpected_value";

export type ImportIssue = {
  level: ImportIssueLevel;
  code: ImportIssueCode;
  sheetName: string;
  rowNumber?: number;
  columnKey?: ImportColumnKey;
  message: string;
};

export type ImportParseResult = {
  payload: ImportPayload | null;
  issues: ImportIssue[];
};

export type ParsedImportRow = {
  sheetName: ImportSheetName;
  rowNumber: number;
  cardId: string;
  title?: string;
  block: ImportBlock;
};

export const IMPORT_SHEET_NAME: ImportSheetName = "blocks";

export const IMPORT_BLOCK_TYPES: ImportBlockType[] = [
  "text",
  "markdown",
  "math",
  "code",
  "image",
];

export const isImportBlockType = (value: string): value is ImportBlockType => {
  return IMPORT_BLOCK_TYPES.includes(value as ImportBlockType);
};

export const formatImportCellLabel = (issue: ImportIssue) => {
  const locationParts = [issue.sheetName];

  if (typeof issue.rowNumber === "number") {
    locationParts.push(String(issue.rowNumber));
  }

  if (issue.columnKey) {
    locationParts.push(issue.columnKey);
  }

  return locationParts.join(":");
};

export const hasImportBlockingError = (result: ImportParseResult | null) => {
  if (!result) return true;
  return result.issues.some((issue) => issue.level === "error");
};
