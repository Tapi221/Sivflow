export type ImportFileKind = "xlsx" | "mfdeck" | "mfcard" | "unknown";

const MF_DECK_MIME_TYPE = "application/vnd.manifolia.deck+zip";
const MF_CARD_MIME_TYPE = "application/vnd.manifolia.card+json";
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const normalizeFileName = (value: string | undefined): string => {
  return (value ?? "").trim().toLowerCase();
};

const normalizeMimeType = (value: string | undefined): string => {
  return (value ?? "").trim().toLowerCase();
};

export const detectImportFileKind = (
  file: Pick<File, "name" | "type">,
): ImportFileKind => {
  const fileName = normalizeFileName(file.name);
  const mimeType = normalizeMimeType(file.type);

  if (fileName.endsWith(".mfdeck") || mimeType === MF_DECK_MIME_TYPE) {
    return "mfdeck";
  }

  if (fileName.endsWith(".mfcard") || mimeType === MF_CARD_MIME_TYPE) {
    return "mfcard";
  }

  if (fileName.endsWith(".xlsx") || mimeType === XLSX_MIME_TYPE) {
    return "xlsx";
  }

  return "unknown";
};

export const isSupportedImportFileKind = (
  kind: ImportFileKind,
): kind is Exclude<ImportFileKind, "unknown"> => {
  return kind !== "unknown";
};
