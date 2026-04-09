import * as XLSX from "xlsx";

import {
  IMPORT_SHEET_NAME,
  type ImportIssue,
  type ImportParseResult,
  type ImportSheetName,
} from "@/features/import/domain/importTypes";

export type ReadXlsxImportRowsResult =
  | {
      sheetName: ImportSheetName;
      rows: unknown[][];
    }
  | ImportParseResult;

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

export const readXlsxImportRows = (
  fileBuffer: ArrayBuffer,
): ReadXlsxImportRowsResult => {
  const workbook = XLSX.read(fileBuffer, {
    type: "array",
    raw: false,
    dense: false,
  });

  const sheetName = IMPORT_SHEET_NAME;
  const worksheet = workbook.Sheets[sheetName];

  if (worksheet == null) {
    return {
      payload: null,
      issues: [
        buildIssue({
          level: "error",
          code: "missing_sheet",
          sheetName,
          message: `シート "${sheetName}" が見つかりません。`,
        }),
      ],
    };
  }

  return {
    sheetName,
    rows: XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as unknown[][],
  };
};
