type ImportFileKind = "xlsx" | "mfdeck" | "mfcard" | "unknown";
type PortableImportFileKind = "mfdeck" | "mfcard";



const IMPORT_FILE_MIME_TYPES = { mfdeck: "application/vnd.sivflow.deck+zip", mfcard: "application/vnd.sivflow.card+json", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } as const satisfies Record<Exclude<ImportFileKind, "unknown">, string>;
const IMPORT_FILE_EXTENSIONS = { mfdeck: ".mfdeck", mfcard: ".mfcard", xlsx: ".xlsx" } as const satisfies Record<Exclude<ImportFileKind, "unknown">, string>;
const IMPORT_FILE_LABELS = { mfdeck: "MFDeck", mfcard: "MFCard", xlsx: "XLSX", unknown: "不明な形式" } as const satisfies Record<ImportFileKind, string>;



const normalizeFileName = (value: string | undefined): string => {
  return (value ?? "").trim().toLowerCase();
};
const normalizeMimeType = (value: string | undefined): string => {
  return (value ?? "").trim().toLowerCase();
};
const detectImportFileKind = (file: Pick<File, "name" | "type">): ImportFileKind => {
  const fileName = normalizeFileName(file.name);
  const mimeType = normalizeMimeType(file.type);

  if (
    fileName.endsWith(IMPORT_FILE_EXTENSIONS.mfdeck) ||
    mimeType === IMPORT_FILE_MIME_TYPES.mfdeck
  ) {
    return "mfdeck";
  }

  if (
    fileName.endsWith(IMPORT_FILE_EXTENSIONS.mfcard) ||
    mimeType === IMPORT_FILE_MIME_TYPES.mfcard
  ) {
    return "mfcard";
  }

  if (
    fileName.endsWith(IMPORT_FILE_EXTENSIONS.xlsx) ||
    mimeType === IMPORT_FILE_MIME_TYPES.xlsx
  ) {
    return "xlsx";
  }

  return "unknown";
};
const isSupportedImportFileKind = (kind: ImportFileKind): kind is Exclude<ImportFileKind, "unknown"> => {
  return kind !== "unknown";
};
const isPortableImportFileKind = (kind: ImportFileKind): kind is PortableImportFileKind => {
  return kind === "mfdeck" || kind === "mfcard";
};
const isPortableImportFile = (file: Pick<File, "name" | "type">) => {
  return isPortableImportFileKind(detectImportFileKind(file));
};
const getSupportedImportFiles = (files: FileList | File[]): File[] => {
  return Array.from(files).filter((file) => isSupportedImportFileKind(detectImportFileKind(file)));
};
const getPortableImportFiles = (files: FileList | File[]): File[] => {
  return Array.from(files).filter(isPortableImportFile);
};



export { IMPORT_FILE_MIME_TYPES, IMPORT_FILE_EXTENSIONS, IMPORT_FILE_LABELS, detectImportFileKind, isSupportedImportFileKind, isPortableImportFileKind, isPortableImportFile, getSupportedImportFiles, getPortableImportFiles };


export type { ImportFileKind, PortableImportFileKind };
