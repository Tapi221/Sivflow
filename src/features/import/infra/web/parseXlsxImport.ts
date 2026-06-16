import { parseImportRows } from "@/features/import/application/parseImportRows";
import type { ImportParseResult } from "@/features/import/domain/import.types";
import { readXlsxImportRows } from "@/features/import/infra/xlsx/readXlsxImportRows";



const parseXlsxImport = async (fileBuffer: ArrayBuffer): Promise<ImportParseResult> => {
  const readResult = readXlsxImportRows(fileBuffer);

  if ("issues" in readResult) {
    return readResult;
  }

  return parseImportRows(readResult);
};



export { parseXlsxImport };
