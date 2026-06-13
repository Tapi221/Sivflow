import { isTypingTarget } from "@/features/hotkey/hotkeyGuards";
import { hasOpenModalDialog } from "@/features/hotkey/modalGuards";
import type { Card, DocumentItem } from "@/types";
import { toMillis } from "@/utils/toMillis";



type FolderTreeNode = {
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
  isFavorite?: boolean;
  is_favorite?: boolean;
  isHidden?: boolean;
  is_hidden?: boolean;
  __optimistic?: boolean;
  [key: string]: unknown;
};



const ROOT_FOLDER_ID = "";
const DEFAULT_NEW_PROJECT_NAME = "新規プロジェクト";
const DEFAULT_NEW_FOLDER_NAME = "新規フォルダ";
const DEFAULT_NEW_CARD_SET_NAME = "新規カードセット";
const UNTITLED_PROJECT_NAME = "無題のプロジェクト";
const UNTITLED_FOLDER_NAME = "無題のフォルダ";



const getFolderId = (folder: FolderTreeNode): string => String(folder?.id ?? folder?.folderId ?? "");
const getParentFolderId = (folder: FolderTreeNode): string | null => {
  const parent = folder?.parentFolderId ?? folder?.parent_folder_id ?? null;
  return (parent === null || parent === undefined) ? null : String(parent);
};
const normalizeFolderId = (folderId: string | null | undefined): string => folderId ?? ROOT_FOLDER_ID;
const isSameFolder = (left: string | null | undefined, right: string | null | undefined): boolean => normalizeFolderId(left) === normalizeFolderId(right);
const getEntityTime = (value: unknown): number => {
  return toMillis(value);
};
const createOptimisticId = (prefix: "folder" | "card"): string => `tmp-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const createDocumentId = (): string => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const buildStoragePath = (uid: string, docId: string, ext: "pdf"): string => `users/${uid}/documents/${docId}/source.${ext}`;
const isTextInputTarget = (target: HTMLElement | null): boolean => isTypingTarget(target);
const isFileDragEvent = (event: React.DragEvent | DragEvent): boolean => {
  const dataTransfer = (event as React.DragEvent).dataTransfer || (event as DragEvent).dataTransfer;
  const types = Array.from(dataTransfer?.types ?? []);
  return types.includes("Files");
};
const extractPdfFiles = (fileList: FileList | null): File[] => {
  if (!fileList) return [];
  return Array.from(fileList).filter((file) => {
    const name = file.name?.toLowerCase() ?? "";
    return file.type === "application/pdf" || name.endsWith(".pdf");
  });
};



export { hasOpenModalDialog, ROOT_FOLDER_ID, DEFAULT_NEW_PROJECT_NAME, DEFAULT_NEW_FOLDER_NAME, DEFAULT_NEW_CARD_SET_NAME, UNTITLED_PROJECT_NAME, UNTITLED_FOLDER_NAME, getFolderId, getParentFolderId, normalizeFolderId, isSameFolder, getEntityTime, createOptimisticId, createDocumentId, buildStoragePath, isTextInputTarget, isFileDragEvent, extractPdfFiles };


export type { Card, DocumentItem, FolderTreeNode };
