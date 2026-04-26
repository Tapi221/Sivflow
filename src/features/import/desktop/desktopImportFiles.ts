import { IMPORT_FILE_MIME_TYPES } from "@/features/import/domain/importFileKind";

export type DesktopImportFileOpenPayload = {
  paths: string[];
};

export type DesktopImportFileReadResult = {
  path: string;
  name: string;
  size: number;
  data: ArrayBuffer | Uint8Array | number[];
};

const getImportFileMimeType = (fileName: string): string => {
  const normalizedFileName = fileName.trim().toLowerCase();

  if (normalizedFileName.endsWith(".mfdeck")) {
    return IMPORT_FILE_MIME_TYPES.mfdeck;
  }

  if (normalizedFileName.endsWith(".mfcard")) {
    return IMPORT_FILE_MIME_TYPES.mfcard;
  }

  return "";
};

const cloneArrayBuffer = (buffer: ArrayBuffer): ArrayBuffer => {
  return buffer.slice(0);
};

const copyViewToArrayBuffer = (view: ArrayBufferView): ArrayBuffer => {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
};

const normalizeDesktopFileData = (
  value: DesktopImportFileReadResult["data"],
): ArrayBuffer => {
  if (value instanceof ArrayBuffer) {
    return cloneArrayBuffer(value);
  }

  if (ArrayBuffer.isView(value)) {
    return copyViewToArrayBuffer(value);
  }

  if (Array.isArray(value)) {
    return Uint8Array.from(value).buffer;
  }

  throw new Error("Unsupported desktop import file payload");
};

export const canUseDesktopImportFiles = (): boolean => {
  return Boolean(
    typeof window !== "undefined" &&
      window.desktop?.files?.readImportFile &&
      window.desktop.files.onImportFileOpen,
  );
};

export const subscribeDesktopImportFileOpen = (
  handler: (payload: DesktopImportFileOpenPayload) => void | Promise<void>,
): (() => void) => {
  if (!canUseDesktopImportFiles()) {
    return () => {};
  }

  return window.desktop.files.onImportFileOpen((payload) => {
    void handler(payload);
  });
};

export const readDesktopImportFile = async (
  filePath: string,
): Promise<File> => {
  if (!canUseDesktopImportFiles()) {
    throw new Error("Desktop import file bridge is unavailable");
  }

  const result = await window.desktop.files.readImportFile(filePath);
  const data = normalizeDesktopFileData(result.data);

  return new File([data], result.name, {
    type: getImportFileMimeType(result.name),
  });
};

export const selectDesktopImportFiles = async (): Promise<File[]> => {
  if (!canUseDesktopImportFiles() || !window.desktop?.files?.selectImportFiles) {
    return [];
  }

  const paths = await window.desktop.files.selectImportFiles();
  return readDesktopImportFiles(paths);
};

export const readDesktopImportFiles = async (
  filePaths: readonly string[],
): Promise<File[]> => {
  const uniquePaths = Array.from(
    new Set(filePaths.map((filePath) => filePath.trim()).filter(Boolean)),
  );

  const files: File[] = [];

  for (const filePath of uniquePaths) {
    files.push(await readDesktopImportFile(filePath));
  }

  return files;
};
