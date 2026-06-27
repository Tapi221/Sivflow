import { removeDocumentBlobUrl } from "@/services/documentBlobUrlSessionCache";
import { deleteDocumentBlob } from "@/services/documentFileStore";
import { safeRevokeBlobUrl } from "./blobUrl";



type DocumentRecord = {
  id?: string;
  localFileId?: string;
  blobUrl?: string;
  localUrl?: string;
  isDeleted?: boolean;
  is_deleted?: boolean;
};
type DocumentUpdateChanges = {
  localFileId?: string | null;
  blobUrl?: string | null;
  localUrl?: string | null;
  [key: string]: unknown;
};
type DocumentsTable = {
  get(id: string): Promise<DocumentRecord | undefined>;
  filter(fn: (doc: DocumentRecord) => boolean): {
    first(): Promise<DocumentRecord | undefined>;
  };
};
type DocDbCtx = {
  documents: DocumentsTable; userId?: string; };



const canDeleteDocumentBlob = async (
  documents: DocumentsTable,
  blobId: string,
  excludeDocumentId: string,
) => {
  if (!blobId) return false;
  const sharedRef = await documents
    .filter((doc: DocumentRecord) => {
      if (!doc || doc.id === excludeDocumentId) return false;
      const refId = doc.localFileId ?? doc.id ?? null;
      if (!refId || refId !== blobId) return false;
      const isDeleted = doc.isDeleted ?? doc.is_deleted ?? false;
      return !isDeleted;
    })
    .first();
  return !sharedRef;
};
const cleanupBeforeDocumentUpdate = async (db: DocDbCtx, id: string, changes: unknown) => {
  const docChanges = changes as DocumentUpdateChanges;
  const hasLocalFileIdChange = Object.prototype.hasOwnProperty.call(
    docChanges,
    "localFileId",
  );
  const hasBlobUrlChange =
    Object.prototype.hasOwnProperty.call(docChanges, "blobUrl") ||
    Object.prototype.hasOwnProperty.call(docChanges, "localUrl");
  try {
    const existingDoc = await db.documents.get(id);
    const previousLocalBlobId =
      existingDoc?.localFileId ?? existingDoc?.id ?? null;
    const nextLocalBlobId = hasLocalFileIdChange
      ? (docChanges.localFileId ?? null)
      : previousLocalBlobId;
    const previousBlobUrl =
      existingDoc?.blobUrl ?? existingDoc?.localUrl ?? null;
    const nextBlobUrl = hasBlobUrlChange
      ? (docChanges.blobUrl ?? docChanges.localUrl ?? null)
      : previousBlobUrl;

    if (previousBlobUrl && previousBlobUrl !== nextBlobUrl) {
      safeRevokeBlobUrl(previousBlobUrl, `documents.updateItem:${id}`);
    } else if (
      previousBlobUrl &&
      hasLocalFileIdChange &&
      previousLocalBlobId &&
      previousLocalBlobId !== nextLocalBlobId &&
      !hasBlobUrlChange
    ) {
      safeRevokeBlobUrl(previousBlobUrl, `documents.updateItem-replace:${id}`);
    }

    if (hasBlobUrlChange && !nextBlobUrl && previousLocalBlobId) {
      removeDocumentBlobUrl(previousLocalBlobId, { userId: db.userId });
    }

    if (
      hasLocalFileIdChange &&
      previousLocalBlobId &&
      previousLocalBlobId !== nextLocalBlobId &&
      db.userId
    ) {
      const canDelete = await canDeleteDocumentBlob(
        db.documents,
        previousLocalBlobId,
        id,
      );
      if (canDelete) {
        await deleteDocumentBlob(previousLocalBlobId, { userId: db.userId });
        removeDocumentBlobUrl(previousLocalBlobId, { userId: db.userId });
      } else {
        console.info("[LocalDB] 共有中のドキュメント blob のため削除をスキップしました", {
          documentId: id,
          localBlobId: previousLocalBlobId,
        });
      }
    }
  } catch (err) {
    console.warn(
      "[LocalDB] updateItem のドキュメント blob 置換クリーンアップに失敗しました",
      err,
    );
  }
};
const cleanupBeforeDocumentDelete = async (db: DocDbCtx, id: string) => {
  try {
    const existingDoc = await db.documents.get(id);
    safeRevokeBlobUrl(
      existingDoc?.blobUrl ?? existingDoc?.localUrl ?? null,
      `documents.deleteItem:${id}`,
    );
    const localBlobId = existingDoc?.localFileId ?? existingDoc?.id ?? id;
    if (localBlobId && db.userId) {
      const canDelete = await canDeleteDocumentBlob(
        db.documents,
        localBlobId,
        id,
      );
      if (canDelete) {
        await deleteDocumentBlob(localBlobId, { userId: db.userId });
        removeDocumentBlobUrl(localBlobId, { userId: db.userId });
      } else {
        console.info("[LocalDB] 共有中のドキュメント blob のため削除をスキップしました", {
          documentId: id,
          localBlobId,
        });
      }
    }
  } catch (err) {
    console.warn("[LocalDB] deleteItem のドキュメント blob クリーンアップに失敗しました", err);
  }
};
const cleanupBeforeDocumentSoftDelete = async (db: DocDbCtx, id: string) => {
  try {
    const existingDoc = await db.documents.get(id);
    safeRevokeBlobUrl(
      existingDoc?.blobUrl ?? existingDoc?.localUrl ?? null,
      `documents.softDelete:${id}`,
    );
    const localBlobId = existingDoc?.localFileId ?? existingDoc?.id ?? id;
    if (localBlobId && db.userId) {
      const canDelete = await canDeleteDocumentBlob(
        db.documents,
        localBlobId,
        id,
      );
      if (canDelete) {
        await deleteDocumentBlob(localBlobId, { userId: db.userId });
        removeDocumentBlobUrl(localBlobId, { userId: db.userId });
      } else {
        console.info("[LocalDB] 共有中のドキュメント blob のため削除をスキップしました", {
          documentId: id,
          localBlobId,
        });
      }
    }
  } catch (err) {
    console.warn("[LocalDB] softDelete のドキュメント blob クリーンアップに失敗しました", err);
  }
};



export { cleanupBeforeDocumentUpdate, cleanupBeforeDocumentDelete, cleanupBeforeDocumentSoftDelete };


export type { DocDbCtx };
