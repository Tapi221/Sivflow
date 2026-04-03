import type { DocumentItem, Card } from "@/types";

export type { DocumentItem, Card };

export type FolderTreeNode = {
  id?: string;
  folderId?: string;
  parentFolderId?: string | null;
  parent_folder_id?: string | null;
  folderName?: string;
  folder_name?: string;
  orderIndex?: number;
  order_index?: number;
  isDeleted?: boolean;
  is_deleted?: boolean;
  isHidden?: boolean;
  is_hidden?: boolean;
  __optimistic?: boolean;
  [key: string]: unknown;
};

export const ROOT_FOLDER_ID = "";
export const DEFAULT_NEW_FOLDER_NAME = "新規フォルダ";
export const DEFAULT_NEW_CARD_SET_NAME = "新規カードセット";

export const getFolderId = (folder: FolderTreeNode): string =>
  String(folder?.id ?? folder?.folderId ?? "");

export const getParentFolderId = (folder: FolderTreeNode): string | null => {
  const parent = folder?.parentFolderId ?? folder?.parent_folder_id ?? null;
  return parent == null ? null : String(parent);
};

export const normalizeFolderId = (
  folderId: string | null | undefined,
): string => folderId ?? ROOT_FOLDER_ID;

export const isSameFolder = (
  left: string | null | undefined,
  right: string | null | undefined,
) => normalizeFolderId(left) === normalizeFolderId(right);

export const getEntityTime = (value: unknown): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === "function")
    return value.toDate()?.getTime?.() ?? 0;
  return 0;
};

export const createOptimisticId = (prefix: "folder" | "card") =>
  `tmp-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const createDocumentId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const buildStoragePath = (
  uid: string,
  docId: string,
  ext: "pdf" | "pptx",
) => `users/${uid}/documents/${docId}/source.${ext}`;

export const isTextInputTarget = (target: HTMLElement | null) => {
  if (!target) return false;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
};

export const isFileDragEvent = (e: React.DragEvent | DragEvent) => {
  const dataTransfer =
    (e as React.DragEvent).dataTransfer || (e as DragEvent).dataTransfer;
  const types = Array.from(dataTransfer?.types ?? []);
  return types.includes("Files");
};

export const hasOpenModalDialog = () =>
  Boolean(
    document.querySelector('[role="dialog"][data-state="open"]') ||
    document.querySelector('[role="dialog"][aria-modal="true"]') ||
    document.querySelector('[role="alertdialog"][data-state="open"]') ||
    document.querySelector('[role="alertdialog"][aria-modal="true"]'),
  );

export const extractPdfFiles = (fileList: FileList | null): File[] => {
  if (!fileList) return [];
  return Array.from(fileList).filter((file) => {
    const name = file.name?.toLowerCase() ?? "";
    return file.type === "application/pdf" || name.endsWith(".pdf");
  });
};

export const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export const extractPptxFiles = (fileList: FileList | null): File[] => {
  if (!fileList) return [];
  return Array.from(fileList).filter((file) => {
    const name = file.name?.toLowerCase() ?? "";
    return file.type === PPTX_MIME || name.endsWith(".pptx");
  });
};
