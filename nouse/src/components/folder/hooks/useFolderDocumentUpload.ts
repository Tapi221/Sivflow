import React, { useCallback, useRef } from "react";
import { auth } from "@platform/firebase/client";
import { useToast } from "@web-renderer/contexts/ToastContext";
import { buildStoragePath, createDocumentId, extractPdfFiles } from "@/components/folder/explorer/model/utils";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { requestGoogleDriveFileAccessToken } from "@/integration/google-integration/googleDrive.oauth";
import { uploadPdfToGoogleDrive } from "@/integration/google-integration/googleDrive.pdfUpload";
import { saveDocumentWithBlob } from "@/services/documentFileStore";
import { getLocalDb } from "@/services/localdb";
import type { DocumentItem } from "@/types";
import { getOrCreateDeviceId } from "@/utils/device";



interface UseFolderDocumentUploadParams {
  actionFolderId: string | null;
  getNextOrderIndex: (folderId: string | null) => number;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
}
type LegacyEntityFields = {
  blobUrl?: string | null; };



const withLegacyFields = <T extends object>(value: T): T & LegacyEntityFields => value as T & LegacyEntityFields;
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown; }).message === "string") {
    return (error as { message: string; }).message;
  }
  return fallback;
};
const useFolderDocumentUpload = ({ actionFolderId, getNextOrderIndex, setExpandedFolders }: UseFolderDocumentUploadParams) => {
  const { currentUser } = useAuthSession();
  const { error: toastError, success: toastSuccess } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetFolderIdRef = useRef<string | null>(null);
  const [currentFileAccept, setCurrentFileAccept] = React.useState(".pdf,application/pdf");

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
      let driveAccessToken: string | null = null;
      let driveAuthFailed = false;

      try {
        driveAccessToken = await requestGoogleDriveFileAccessToken(auth);
      } catch (error) {
        driveAuthFailed = true;
        console.error("[useFolderDocumentUpload] Google Drive auth failed", error);
        toastError?.(getErrorMessage(error, "Google Driveの認可に失敗しました。PDFはローカルに保存されます。"));
      }

      for (const file of pdfFiles) {
        const now = new Date();
        const docId = createDocumentId();
        const storagePath = buildStoragePath(currentUser.uid, docId, "pdf");
        const mimeType = file.type ?? "application/pdf";

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
          uploadStatus: driveAuthFailed ? "failed" : "pending",
          googleDriveFileId: null,
          googleDriveWebViewLink: null,
          googleDriveWebContentLink: null,
        };

        try {
          await saveDocumentWithBlob({ db, document: baseDoc, blob: file });
          nextOrderIndex += 1;
        } catch (localErr: unknown) {
          console.error("[useFolderDocumentUpload] Failed to persist PDF locally", { error: localErr, docId, fileName: file.name });
          toastError?.(getErrorMessage(localErr, "PDFのローカル保存に失敗しました"));
          continue;
        }

        if (!driveAccessToken) {
          const latestDoc = await db.documents.get(docId);
          console.info("[useFolderDocumentUpload] PDF kept local because Google Drive token is unavailable", { docId, localFileId: latestDoc?.localFileId ?? null, blobUrl: withLegacyFields(latestDoc ?? {}).blobUrl ?? latestDoc?.localUrl ?? null });
          continue;
        }

        try {
          await db.documents.update(docId, { uploadStatus: "uploading", updatedAt: new Date() });

          const result = await uploadPdfToGoogleDrive({ accessToken: driveAccessToken, fileName: file.name, pdf: file });

          await db.updateItem("documents", docId, {
            downloadUrl: result.webContentLink ?? result.webViewLink,
            storagePath: `google-drive://${result.id}`,
            uploadStatus: "ready",
            googleDriveFileId: result.id,
            googleDriveWebViewLink: result.webViewLink,
            googleDriveWebContentLink: result.webContentLink,
            updatedAt: new Date(),
          });

          toastSuccess?.("PDFをGoogle Driveに保存しました");
        } catch (err: unknown) {
          console.error("[useFolderDocumentUpload] Google Drive PDF upload failed", err);
          try {
            await db.documents.update(docId, { uploadStatus: "failed", updatedAt: new Date() });
            const failedDoc = await db.documents.get(docId);
            console.error("[useFolderDocumentUpload] Drive upload failed but local source kept", { docId, localFileId: failedDoc?.localFileId ?? null, blobUrl: withLegacyFields(failedDoc ?? {}).blobUrl ?? failedDoc?.localUrl ?? null });
          } catch (markErr) {
            console.error("[useFolderDocumentUpload] Failed to mark Drive upload failure", markErr);
          }
          toastError?.(getErrorMessage(err, "Google DriveへのPDF保存に失敗しました"));
        }
      }

      setExpandedFolders((prev) => new Set(prev).add(folderId));
    },
    [currentUser, getNextOrderIndex, toastError, toastSuccess, setExpandedFolders],
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



export { useFolderDocumentUpload };
