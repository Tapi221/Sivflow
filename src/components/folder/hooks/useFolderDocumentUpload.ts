import {
  buildStoragePath,
  createDocumentId,
  extractPdfFiles,
} from "@/components/folder/explorer/model/utils";
import { useAuthSession } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useReliableFileUpload } from "@/hooks/platform/useReliableFileUpload";
import { saveDocumentWithBlob } from "@/services/documentFileStore";
import { getLocalDb } from "@/services/localDB";
import type { DocumentItem } from "@/types";
import { getOrCreateDeviceId } from "@/utils/device";
import React, { useCallback, useRef } from "react";

interface UseFolderDocumentUploadParams {
  actionFolderId: string | null;
  getNextOrderIndex: (folderId: string | null) => number;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
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

export const useFolderDocumentUpload = ({
  actionFolderId,
  getNextOrderIndex,
  setExpandedFolders,
}: UseFolderDocumentUploadParams) => {
  const { currentUser } = useAuthSession();
  const { error: toastError } = useToast();
  const { uploadFile } = useReliableFileUpload();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetFolderIdRef = useRef<string | null>(null);
  const [currentFileAccept, setCurrentFileAccept] = React.useState(
    ".pdf,application/pdf",
  );

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
          await saveDocumentWithBlob({
            db,
            document: baseDoc,
            blob: file,
          });
          nextOrderIndex += 1;
        } catch (localErr: unknown) {
          console.error(
            "[useFolderDocumentUpload] Failed to persist PDF locally",
            {
              error: localErr,
              docId,
              fileName: file.name,
            },
          );
          toastError?.(
            getErrorMessage(localErr, "PDFのローカル保存に失敗しました"),
          );
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
            console.info(
              "[useFolderDocumentUpload] PDF upload queued in local-only mode",
              {
                docId,
                uploadSource: result.source,
                uploadStatus: latestDoc?.uploadStatus ?? null,
                localFileId: latestDoc?.localFileId ?? null,
                blobUrl:
                  withLegacyFields(latestDoc ?? {}).blobUrl ??
                  latestDoc?.localUrl ??
                  null,
              },
            );
          }
        } catch (err: unknown) {
          console.error("[useFolderDocumentUpload] PDF upload failed", err);
          try {
            await db.updateItem("documents", docId, {
              uploadStatus: "failed",
              updatedAt: new Date(),
            });
            const failedDoc = await db.documents.get(docId);
            console.error(
              "[useFolderDocumentUpload] PDF upload failed but local source kept",
              {
                docId,
                localFileId: failedDoc?.localFileId ?? null,
                blobUrl:
                  withLegacyFields(failedDoc ?? {}).blobUrl ??
                  failedDoc?.localUrl ??
                  null,
              },
            );
          } catch (markErr) {
            console.error(
              "[useFolderDocumentUpload] Failed to mark PDF upload failure",
              markErr,
            );
          }
          toastError?.(getErrorMessage(err, "PDFの追加に失敗しました"));
        }
      }

      setExpandedFolders((prev) => new Set(prev).add(folderId));
    },
    [
      currentUser,
      getNextOrderIndex,
      toastError,
      uploadFile,
      setExpandedFolders,
    ],
  );

  const handleToolbarAddDocument = useCallback(() => {
    const targetFolderId = actionFolderId;
    if (!targetFolderId) {
      toastError?.("ファイル追加先のフォルダを選択してください");
      return;
    }
    uploadTargetFolderIdRef.current = targetFolderId;
    setCurrentFileAccept(".pdf,application/pdf");
    fileInputRef.current?.click();
  }, [actionFolderId, toastError]);

  const handleToolbarFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const targetFolderId = uploadTargetFolderIdRef.current;
      const files = event.target.files;
      if (!targetFolderId || !files) {
        event.target.value = "";
        return;
      }

      const pdfFiles = extractPdfFiles(files);
      event.target.value = "";

      if (pdfFiles.length > 0) {
        void handlePdfDropped(targetFolderId, pdfFiles);
      } else {
        toastError?.("PDFファイルを選択してください");
      }

      setCurrentFileAccept(".pdf,application/pdf");
    },
    [handlePdfDropped, toastError],
  );

  return {
    fileInputRef,
    handlePdfDropped,
    handleToolbarAddDocument,
    currentFileAccept,
    handleToolbarFileInputChange,
  };
};
