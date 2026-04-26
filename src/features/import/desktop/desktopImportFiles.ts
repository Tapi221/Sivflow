export type DesktopImportFileOpenPayload = {
  paths: string[];
};

export type DesktopImportFileReadResult = {
  path: string;
  name: string;
  size: number;
  data: ArrayBuffer | Uint8Array | number[];
};

const MF_DECK_MIME_TYPE = "application/vnd.manifolia.deck+zip";
const MF_CARD_MIME_TYPE = "application/vnd.manifolia.card+json";

const getImportFileMimeType = (fileName: string): string => {
  const normalizedFileName = fileName.trim().toLowerCase();

  if (normalizedFileName.endsWith(".mfdeck")) {
    return MF_DECK_MIME_TYPE;
  }

  if (normalizedFileName.endsWith(".mfcard")) {
    return MF_CARD_MIME_TYPE;
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
