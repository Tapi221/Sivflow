import type { ImportParseResult } from "@/features/import/domain/importTypes";
import { parseImportRows } from "@/features/import/application/parseImportRows";
import { readXlsxImportRows } from "@/features/import/infra/xlsx/readXlsxImportRows";

export const parseXlsxImport = async (
  fileBuffer: ArrayBuffer,
): Promise<ImportParseResult> => {
  const readResult = readXlsxImportRows(fileBuffer);

  if ("issues" in readResult) {
    return readResult;
  }

  return parseImportRows(readResult);
};
