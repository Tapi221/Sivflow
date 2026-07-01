import { IMPORT_FILE_MIME_TYPES } from "@/features/import/domain/importFileKind";



type DesktopImportFileOpenPayload = {
  paths: string[];
};
type DesktopImportFileReadResult = {
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
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  return Uint8Array.from(bytes).buffer;
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
const canUseDesktopImportFiles = (): boolean => {
  return Boolean(typeof window !== "undefined" && window.desktop?.files?.readImportFile && window.desktop.files.onImportFileOpen);
};
const subscribeDesktopImportFileOpen = (handler: (payload: DesktopImportFileOpenPayload) => void | Promise<void>): (() => void) => {
  if (!canUseDesktopImportFiles()) {
    return () => {};
  }

  const filesApi = window.desktop?.files;
  if (!filesApi?.onImportFileOpen) {
    return () => {};
  }

  return filesApi.onImportFileOpen((payload) => {
    void handler(payload);
  });
};
const readDesktopImportFile = async (filePath: string): Promise<File> => {
  if (!canUseDesktopImportFiles()) {
    throw new Error("Desktop import file bridge is unavailable");
  }

  const filesApi = window.desktop?.files;
  if (!filesApi?.readImportFile) {
    throw new Error("Desktop import file bridge is unavailable");
  }

  const result = await filesApi.readImportFile(filePath);
  const data = normalizeDesktopFileData(result.data);

  return new File([data], result.name, {
    type: getImportFileMimeType(result.name),
  });
};
const readDesktopImportFiles = async (filePaths: readonly string[]): Promise<File[]> => {
  const uniquePaths = Array.from(new Set(filePaths.map((filePath) => filePath.trim()).filter(Boolean)));

  const files: File[] = [];

  for (const filePath of uniquePaths) {
    files.push(await readDesktopImportFile(filePath));
  }

  return files;
};
const selectDesktopImportFiles = async (): Promise<File[]> => {
  if (!canUseDesktopImportFiles() || !window.desktop?.files?.selectImportFiles) {
    return [];
  }

  const paths = await window.desktop.files.selectImportFiles();
  return readDesktopImportFiles(paths);
};



export { canUseDesktopImportFiles, subscribeDesktopImportFileOpen, readDesktopImportFile, selectDesktopImportFiles, readDesktopImportFiles };


export type { DesktopImportFileOpenPayload, DesktopImportFileReadResult };
