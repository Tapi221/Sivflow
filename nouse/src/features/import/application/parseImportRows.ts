import { groupParsedRowsToCards } from "./groupParsedRowsToCards";
import type { ImportBlock, ImportColumnKey, ImportIssue, ImportParseResult, ImportSheetName, ImportSide, ParsedImportRow } from "@/features/import/domain/import.types";
import { isImportBlockType, isImportSide } from "@/features/import/domain/import.types";



type HeaderMap = Partial<Record<ImportColumnKey, number>>;
type RowCellMap = Partial<Record<ImportColumnKey, string>>;
type BuildRowBlockResult = {
  side: ImportSide | null;
  block: ImportBlock | null;
  issues: ImportIssue[];
};



const REQUIRED_HEADERS: ImportColumnKey[] = ["cardId", "blockOrder", "type"];



const buildIssue = ({
  level,
  code,
  sheetName,
  rowNumber,
  columnKey,
  message,
}: ImportIssue): ImportIssue => {
  return {
    level,
    code,
    sheetName,
    rowNumber,
    columnKey,
    message,
  };
};
const normalizeHeaderName = (value: string): ImportColumnKey | null => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (normalized === "cardid") return "cardId";
  if (normalized === "side" || normalized === "face") return "side";
  if (normalized === "blockorder" || normalized === "order") {
    return "blockOrder";
  }
  if (normalized === "type") return "type";
  if (normalized === "content") return "content";
  if (normalized === "language" || normalized === "lang") return "language";
  if (normalized === "image") return "image";
  if (normalized === "title") return "title";
  if (normalized === "note" || normalized === "memo") return "note";

  return null;
};
const toTrimmedString = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};
const parseHeaderMap = (headerRow: unknown[]): HeaderMap => {
  return headerRow.reduce<HeaderMap>((accumulator, cellValue, columnIndex) => {
    const normalizedKey = normalizeHeaderName(toTrimmedString(cellValue));

    if ((normalizedKey === null || normalizedKey === undefined) || (accumulator[normalizedKey] !== null && accumulator[normalizedKey] !== undefined)) {
      return accumulator;
    }

    accumulator[normalizedKey] = columnIndex;
    return accumulator;
  }, {});
};
const getCellValue = (
  row: unknown[],
  headerMap: HeaderMap,
  columnKey: ImportColumnKey,
) => {
  const columnIndex = headerMap[columnKey];

  if (columnIndex === null || columnIndex === undefined) {
    return "";
  }

  return toTrimmedString(row[columnIndex]);
};
const getRowCellMap = (row: unknown[], headerMap: HeaderMap): RowCellMap => {
  return {
    cardId: getCellValue(row, headerMap, "cardId"),
    side: getCellValue(row, headerMap, "side"),
    blockOrder: getCellValue(row, headerMap, "blockOrder"),
    type: getCellValue(row, headerMap, "type"),
    content: getCellValue(row, headerMap, "content"),
    language: getCellValue(row, headerMap, "language"),
    image: getCellValue(row, headerMap, "image"),
    title: getCellValue(row, headerMap, "title"),
    note: getCellValue(row, headerMap, "note"),
  };
};
const isCompletelyEmptyRow = (row: unknown[]) => {
  return row.every((cellValue) => toTrimmedString(cellValue) === "");
};
const parseBlockOrder = (rawValue: string) => {
  if (rawValue === "") {
    return null;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};
const parseImportSide = (rawValue: string): ImportSide | null => {
  const normalized = rawValue.trim().toLowerCase();

  if (normalized === "") return "front";
  if (isImportSide(normalized)) return normalized;

  return null;
};
const validateRequiredHeaders = (
  headerMap: HeaderMap,
  sheetName: ImportSheetName,
) => {
  return REQUIRED_HEADERS.flatMap((columnKey) => {
    if (headerMap[columnKey] !== null && headerMap[columnKey] !== undefined) {
      return [];
    }

    return [
      buildIssue({
        level: "error",
        code: "missing_required_header",
        sheetName,
        columnKey,
        message: `必須ヘッダー "${columnKey}" が見つかりません。`,
      }),
    ];
  });
};
const validateRequiredCells = (
  rowNumber: number,
  sheetName: ImportSheetName,
  rowCellMap: RowCellMap,
) => {
  const issues: ImportIssue[] = [];

  if (!rowCellMap.cardId) {
    issues.push(
      buildIssue({
        level: "error",
        code: "missing_required_cell",
        sheetName,
        rowNumber,
        columnKey: "cardId",
        message: "cardId は必須です。",
      }),
    );
  }

  if (!rowCellMap.blockOrder) {
    issues.push(
      buildIssue({
        level: "error",
        code: "missing_required_cell",
        sheetName,
        rowNumber,
        columnKey: "blockOrder",
        message: "blockOrder は必須です。",
      }),
    );
  }

  if (!rowCellMap.type) {
    issues.push(
      buildIssue({
        level: "error",
        code: "missing_required_cell",
        sheetName,
        rowNumber,
        columnKey: "type",
        message: "type は必須です。",
      }),
    );
  }

  return issues;
};
const buildRowBlock = ({
  rowNumber,
  sheetName,
  rowCellMap,
}: {
  rowNumber: number;
  sheetName: ImportSheetName;
  rowCellMap: RowCellMap;
}): BuildRowBlockResult => {
  const issues: ImportIssue[] = [];
  const parsedSide = parseImportSide(rowCellMap.side ?? "");
  const parsedOrder = parseBlockOrder(rowCellMap.blockOrder ?? "");

  if (parsedSide === null || parsedSide === undefined) {
    return {
      side: null,
      block: null,
      issues: [
        buildIssue({
          level: "error",
          code: "invalid_side",
          sheetName,
          rowNumber,
          columnKey: "side",
          message:
            "side は \"front\" | \"back\" のいずれかで指定してください。未指定なら front 扱いです。",
        }),
      ],
    };
  }

  if (parsedOrder === null || parsedOrder === undefined) {
    return {
      side: parsedSide,
      block: null,
      issues: [
        buildIssue({
          level: "error",
          code: "invalid_block_order",
          sheetName,
          rowNumber,
          columnKey: "blockOrder",
          message: "blockOrder は 1 以上の整数で指定してください。",
        }),
      ],
    };
  }

  const normalizedType = (rowCellMap.type ?? "").toLowerCase();

  if (!isImportBlockType(normalizedType)) {
    return {
      side: parsedSide,
      block: null,
      issues: [
        buildIssue({
          level: "error",
          code: "invalid_type",
          sheetName,
          rowNumber,
          columnKey: "type",
          message:
            "type は \"text\" | \"markdown\" | \"math\" | \"code\" | \"image\" のいずれかで指定してください。",
        }),
      ],
    };
  }

  if (normalizedType === "image") {
    return {
      side: parsedSide,
      block: null,
      issues: [
        buildIssue({
          level: "error",
          code: "unsupported_image_cell",
          sheetName,
          rowNumber,
          columnKey: "image",
          message:
            "type=image はまだ未対応です。セル内画像の読取実装を追加してから有効化してください。",
        }),
      ],
    };
  }

  if (!rowCellMap.content) {
    return {
      side: parsedSide,
      block: null,
      issues: [
        buildIssue({
          level: "error",
          code: "empty_content",
          sheetName,
          rowNumber,
          columnKey: "content",
          message: `type=${normalizedType} の行では content が必須です。`,
        }),
      ],
    };
  }

  if (normalizedType !== "code" && rowCellMap.language) {
    issues.push(
      buildIssue({
        level: "warning",
        code: "unexpected_value",
        sheetName,
        rowNumber,
        columnKey: "language",
        message:
          "language は type=code のときだけ使用されます。今回は無視します。",
      }),
    );
  }

  return {
    side: parsedSide,
    block: {
      type: normalizedType,
      order: parsedOrder,
      content: rowCellMap.content,
      language:
        normalizedType === "code"
          ? rowCellMap.language || undefined
          : undefined,
    },
    issues,
  };
};
const parseImportRows = ({
  sheetName,
  rows,
}: {
  sheetName: ImportSheetName;
  rows: unknown[][];
}): ImportParseResult => {
  const headerRow = rows[0] ?? [];
  const headerMap = parseHeaderMap(headerRow);
  const headerIssues = validateRequiredHeaders(headerMap, sheetName);

  if (headerIssues.length > 0) {
    return {
      payload: null,
      issues: headerIssues,
    };
  }

  const issues: ImportIssue[] = [];
  const parsedRows: ParsedImportRow[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const rowNumber = rowIndex + 1;

    if (isCompletelyEmptyRow(row)) {
      continue;
    }

    const rowCellMap = getRowCellMap(row, headerMap);
    const requiredCellIssues = validateRequiredCells(
      rowNumber,
      sheetName,
      rowCellMap,
    );

    if (requiredCellIssues.length > 0) {
      issues.push(...requiredCellIssues);
      continue;
    }

    const {
      side,
      block,
      issues: rowIssues,
    } = buildRowBlock({
      rowNumber,
      sheetName,
      rowCellMap,
    });

    issues.push(...rowIssues);

    if ((side === null || side === undefined) || (block === null || block === undefined)) {
      continue;
    }

    parsedRows.push({
      sheetName,
      rowNumber,
      cardId: rowCellMap.cardId!,
      side,
      title: rowCellMap.title || undefined,
      block,
    });
  }

  const grouped = groupParsedRowsToCards(parsedRows);
  const allIssues = [...issues, ...grouped.issues];
  const hasError = allIssues.some((issue) => issue.level === "error");

  if (hasError) {
    return {
      payload: null,
      issues: allIssues,
    };
  }

  return {
    payload: {
      version: 1,
      source: "xlsx",
      cards: grouped.cards,
    },
    issues: allIssues,
  };
};



export { parseImportRows };
