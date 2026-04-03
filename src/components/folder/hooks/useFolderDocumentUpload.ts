import {
    buildStoragePath,
    createDocumentId,
    extractPdfFiles,
    extractPptxFiles,
    PPTX_MIME,
} from "@/components/folder/explorer/model/utils";
import { useAuthSession } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useReliableFileUpload } from "@/hooks/platform/useReliableFileUpload";
import { saveDocumentBlob } from "@/services/documentFileStore";
import { getLocalDb } from "@/services/localDB";
import type { DocumentItem } from "@/types";
import { getOrCreateDeviceId } from "@/utils/device";
import React, { useCallback, useRef } from "react";

interface UseFolderDocumentUploadParams {
  selectedFolderId: string | null;
  actionFolderId: string | null;
  getNextOrderIndex: (folderId: string | null) => number;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
}

interface UseFolderDocumentUploadReturn {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handlePdfDropped: (folderId: string, files: File[]) => Promise<void>;
  handlePptxDropped: (folderId: string, files: File[]) => Promise<void>;
  handleToolbarAddFile: () => void;
  handleToolbarAddPdf: () => void;
  handleToolbarAddPptx: () => void;
  currentFileAccept: string;
  handleToolbarFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

type LegacyEntityFields = { blobUrl?: string | null };
const withLegacyFields = <T extends object>(value: T): T & LegacyEntityFields =>
  value as T & LegacyEntityFields;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
};

export function useFolderDocumentUpload({
  selectedFolderId,
  actionFolderId,
  getNextOrderIndex,
  setExpandedFolders,
}: UseFolderDocumentUploadParams): UseFolderDocumentUploadReturn {
  const { currentUser } = useAuthSession();
  const { error: toastError } = useToast();
  const { uploadFile } = useReliableFileUpload();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetFolderIdRef = useRef<string | null>(null);
  const [currentFileAccept, setCurrentFileAccept] = React.useState(
    ".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  );
  const uploadTypeRef = useRef<"all" | "pdf" | "pptx">("all");

  const handlePdfDropped = useCallback(
    async (folderId: string, files: File[]) => {
      if (!files.length) return;
      if (!currentUser) {
        toastError?.("PDFの追加にはログインが必要です");
        return;
      }

      const pdfFiles = files.filter((file) => {
        const name = file.name?.toLowerCase() ?? "";
        return file.type === "application/pdf" || name.endsWith(".pdf");
      });

      if (pdfFiles.length === 0) return;

      const db = await getLocalDb(currentUser.uid);
      let nextOrderIndex = getNextOrderIndex(folderId);

      for (const file of pdfFiles) {
        const now = new Date();
        const docId = createDocumentId();
        const storagePath = buildStoragePath(currentUser.uid, docId, "pdf");
        const mimeType = file.type || "application/pdf";
        const baseDoc: DocumentItem = {
          id: docId,
          userId: currentUser.uid,
          deviceId: getOrCreateDeviceId(),
          createdAt: now,
          updatedAt: now,
          isDeleted: false,
          kind: "pdf",
          folderId,
          orderIndex: nextOrderIndex,
          title: file.name,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
          blobUrl: null,
          localUrl: null,
          localFileId: docId,
          remoteUrl: null,
          storagePath,
          downloadUrl: null,
          uploadStatus: "pending",
        };

        try {
          await saveDocumentBlob(docId, file, { userId: currentUser.uid });
          await db.documents.put(baseDoc as DocumentItem & Record<string, unknown>);
          nextOrderIndex += 1;
        } catch (localErr: unknown) {
          console.error("[useFolderDocumentUpload] Failed to prepare local PDF source", {
            error: localErr,
            docId,
            fileName: file.name,
          });
          toastError?.(getErrorMessage(localErr, "PDFのローカル保存に失敗しました"));
          continue;
        }

        try {
          const result = await uploadFile(file, () => storagePath, {
            type: "pdf",
            folderId,
            docId,
          });

          const remoteDownloadUrl = result.metadata?.downloadUrl ?? null;
          await db.updateItem("documents", docId, {
            storagePath: result.storagePath || storagePath,
            remoteUrl: remoteDownloadUrl,
            downloadUrl: remoteDownloadUrl,
            uploadStatus: remoteDownloadUrl ? "ready" : "queued",
            updatedAt: new Date(),
          });

          if (!remoteDownloadUrl) {
            const latestDoc = await db.documents.get(docId);
            console.info("[useFolderDocumentUpload] PDF upload queued in local-only mode", {
              docId,
              uploadSource: result.source,
              uploadStatus: latestDoc?.uploadStatus ?? null,
              localFileId: latestDoc?.localFileId ?? null,
              blobUrl:
                withLegacyFields(latestDoc ?? {}).blobUrl ?? latestDoc?.localUrl ?? null,
            });
          }
        } catch (err: unknown) {
          console.error("[useFolderDocumentUpload] PDF upload failed", err);
          try {
            await db.updateItem("documents", docId, {
              uploadStatus: "failed",
              updatedAt: new Date(),
            });
            const failedDoc = await db.documents.get(docId);
            console.error("[useFolderDocumentUpload] PDF upload failed but local source kept", {
              docId,
              localFileId: failedDoc?.localFileId ?? null,
              blobUrl:
                withLegacyFields(failedDoc ?? {}).blobUrl ?? failedDoc?.localUrl ?? null,
            });
          } catch (markErr) {
            console.error(
              "[useFolderDocumentUpload] Failed to mark PDF upload failure",
              markErr,
            );
          }
          toastError?.(getErrorMessage(err, "PDFの追加に失敗しました"));
        }
      }

      if (pdfFiles.length > 0) {
        setExpandedFolders((prev) => new Set(prev).add(folderId));
      }
    },
    [currentUser, getNextOrderIndex, toastError, uploadFile, setExpandedFolders],
  );

  const handlePptxDropped = useCallback(
    async (folderId: string, files: File[]) => {
      if (!files.length) return;
      if (!currentUser) {
        toastError?.("PPTXの追加にはログインが必要です");
        return;
      }

      const pptxFiles = files.filter((file) => {
        const name = file.name?.toLowerCase() ?? "";
        return file.type === PPTX_MIME || name.endsWith(".pptx");
      });

      if (pptxFiles.length === 0) return;

      const db = await getLocalDb(currentUser.uid);
      let nextOrderIndex = getNextOrderIndex(folderId);

      for (const file of pptxFiles) {
        const now = new Date();
        const docId = createDocumentId();
        const storagePath = buildStoragePath(currentUser.uid, docId, "pptx");
        const mimeType = file.type || PPTX_MIME;
        const baseDoc: DocumentItem = {
          id: docId,
          userId: currentUser.uid,
          deviceId: getOrCreateDeviceId(),
          createdAt: now,
          updatedAt: now,
          isDeleted: false,
          kind: "pptx",
          convertStatus: "processing",
          pptxManifestStatus: "none",
          pptxManifestPath: null,
          pptxSlideCount: null,
          pptxLastError: null,
          pptxConvertRequestedAt: null,
          pptxConvertedAt: null,
          pptx: {
            manifestPath: null,
            fallbackPdfPath: null,
            slideCount: null,
            updatedAt: now,
            error: null,
          },
          folderId,
          orderIndex: nextOrderIndex,
          title: file.name,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
          blobUrl: null,
          localUrl: null,
          localFileId: docId,
          remoteUrl: null,
          storagePath,
          downloadUrl: null,
          uploadStatus: "pending",
        };

        try {
          await saveDocumentBlob(docId, file, { userId: currentUser.uid });
          await db.documents.put(baseDoc as DocumentItem & Record<string, unknown>);
          nextOrderIndex += 1;
        } catch (localErr: unknown) {
          console.error("[useFolderDocumentUpload] Failed to prepare local PPTX source", {
            error: localErr,
            docId,
            fileName: file.name,
          });
          toastError?.(getErrorMessage(localErr, "PPTXのローカル保存に失敗しました"));
          continue;
        }

        try {
          const result = await uploadFile(file, () => storagePath, {
            type: "pptx",
            folderId,
            docId,
          });

          const remoteDownloadUrl = result.metadata?.downloadUrl ?? null;
          await db.updateItem("documents", docId, {
            storagePath: result.storagePath || storagePath,
            remoteUrl: remoteDownloadUrl,
            downloadUrl: remoteDownloadUrl,
            uploadStatus: remoteDownloadUrl ? "ready" : "queued",
            updatedAt: new Date(),
          });

          if (!remoteDownloadUrl) {
            const latestDoc = await db.documents.get(docId);
            console.info("[useFolderDocumentUpload] PPTX upload queued in local-only mode", {
              docId,
              uploadSource: result.source,
              uploadStatus: latestDoc?.uploadStatus ?? null,
              localFileId: latestDoc?.localFileId ?? null,
              blobUrl:
                withLegacyFields(latestDoc ?? {}).blobUrl ?? latestDoc?.localUrl ?? null,
            });
          }
        } catch (err: unknown) {
          console.error("[useFolderDocumentUpload] PPTX upload failed", err);
          try {
            const failedAt = new Date();
            const message = getErrorMessage(err, "upload_failed");
            await db.updateItem("documents", docId, {
              uploadStatus: "failed",
              convertStatus: "failed",
              pptxManifestStatus: "failed",
              pptxLastError: message,
              pptx: {
                ...(baseDoc.pptx ?? {}),
                error: message,
                updatedAt: failedAt,
              },
              updatedAt: failedAt,
            });
            const failedDoc = await db.documents.get(docId);
            console.error(
              "[useFolderDocumentUpload] PPTX upload failed but local source kept",
              {
                docId,
                localFileId: failedDoc?.localFileId ?? null,
                blobUrl:
                  withLegacyFields(failedDoc ?? {}).blobUrl ?? failedDoc?.localUrl ?? null,
              },
            );
          } catch (markErr) {
            console.error(
              "[useFolderDocumentUpload] Failed to mark PPTX upload failure",
              markErr,
            );
          }
          toastError?.(getErrorMessage(err, "PPTXの追加に失敗しました"));
        }
      }

      setExpandedFolders((prev) => new Set(prev).add(folderId));
    },
    [currentUser, getNextOrderIndex, toastError, uploadFile, setExpandedFolders],
  );

  const handleToolbarAddFile = useCallback(() => {
    const targetFolderId = actionFolderId;
    if (!targetFolderId) {
      toastError?.("ファイル追加先のフォルダを選択してください");
      return;
    }
    uploadTargetFolderIdRef.current = targetFolderId;
    uploadTypeRef.current = "all";
    setCurrentFileAccept(
      ".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    fileInputRef.current?.click();
  }, [actionFolderId, toastError]);

  const handleToolbarAddPdf = useCallback(() => {
    const targetFolderId = actionFolderId;
    if (!targetFolderId) {
      toastError?.("ファイル追加先のフォルダを選択してください");
      return;
    }
    uploadTargetFolderIdRef.current = targetFolderId;
    uploadTypeRef.current = "pdf";
    setCurrentFileAccept(".pdf,application/pdf");
    fileInputRef.current?.click();
  }, [actionFolderId, toastError]);

  const handleToolbarAddPptx = useCallback(() => {
    const targetFolderId = actionFolderId;
    if (!targetFolderId) {
      toastError?.("ファイル追加先のフォルダを選択してください");
      return;
    }
    uploadTargetFolderIdRef.current = targetFolderId;
    uploadTypeRef.current = "pptx";
    setCurrentFileAccept(
      ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    fileInputRef.current?.click();
  }, [actionFolderId, toastError]);

  const handleToolbarFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const targetFolderId = uploadTargetFolderIdRef.current;
      const uploadType = uploadTypeRef.current;
      const files = event.target.files;
      event.target.value = "";

      if (!targetFolderId || !files) return;

      const pdfFiles = extractPdfFiles(files);
      const pptxFiles = extractPptxFiles(files);

      if (uploadType !== "pptx" && pdfFiles.length > 0) {
        void handlePdfDropped(targetFolderId, pdfFiles);
      }
      if (uploadType !== "pdf" && pptxFiles.length > 0) {
        void handlePptxDropped(targetFolderId, pptxFiles);
      }

      if (uploadType === "pdf" && pdfFiles.length === 0) {
        toastError?.("PDFファイルを選択してください");
      } else if (uploadType === "pptx" && pptxFiles.length === 0) {
        toastError?.("PPTXファイルを選択してください");
      } else if (uploadType === "all" && pdfFiles.length === 0 && pptxFiles.length === 0) {
        toastError?.("PDFまたはPPTXファイルを選択してください");
      }

      uploadTypeRef.current = "all";
      setCurrentFileAccept(
        ".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
    },
    [handlePdfDropped, handlePptxDropped, toastError],
  );

  return {
    fileInputRef,
    handlePdfDropped,
    handlePptxDropped,
    handleToolbarAddFile,
    handleToolbarAddPdf,
    handleToolbarAddPptx,
    currentFileAccept,
    handleToolbarFileInputChange,
  };
}







