import { useCallback } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { deleteDocumentBlob } from "@/services/documentFileStore";
import { getLocalDb } from "@/services/localdb";
import type { DocumentItem } from "@/types";
import { normalizeDate } from "@/utils/codec/date";



type UpdateDocumentOptions = {
  touchUpdatedAt?: boolean;
};
type DocumentUpdatePayload = Record<string, unknown> & {
  deviceId: string;
  updatedAt?: Date;
};
type DocumentUpdateCapableDb = Awaited<ReturnType<typeof getLocalDb>> & {
  updateItem: (table: "documents", id: string, changes: Record<string, unknown>, skipSync?: boolean) => Promise<number>;
};
type DocumentPurgeCapableDb = Awaited<ReturnType<typeof getLocalDb>> & {
  documents: {
    get: (id: string) => Promise<DocumentItem | undefined>;
    delete: (id: string) => Promise<void>;
  };
  runSyncTransaction: <T>(scope: () => Promise<T>) => Promise<T>;
  table: (tableName: "documentFiles") => {
    delete: (id: string) => Promise<void>;
  };
  queueDeleteSync: (args: { entity: "document"; targetId: string; priority?: "critical" | "high" | "medium" | "low"; }) => Promise<void>;
};



const VIEWER_STATE_UPDATE_KEYS = new Set(["viewerState", "updatedAt"]);



const normalizeUpdatedAt = (value: DocumentItem["updatedAt"] | undefined): Date | undefined => {
  return normalizeDate(value) ?? undefined;
};
const resolveDocumentFileId = (documentId: string, document: Pick<DocumentItem, "localFileId"> | undefined): string => {
  const localFileId = typeof document?.localFileId === "string" ? document.localFileId.trim() : "";
  return localFileId.length > 0 ? localFileId : documentId;
};
const isViewerStateOnlyUpdate = (updates: Partial<DocumentItem>): boolean => {
  const keys = Object.keys(updates);
  return keys.includes("viewerState") && keys.every((key) => VIEWER_STATE_UPDATE_KEYS.has(key));
};
const shouldTouchUpdatedAtForUpdates = (updates: Partial<DocumentItem>, options: UpdateDocumentOptions): boolean => {
  if (typeof options.touchUpdatedAt === "boolean") return options.touchUpdatedAt;
  return Object.keys(updates).some((key) => !VIEWER_STATE_UPDATE_KEYS.has(key));
};
const useDocumentCommands = () => {
  const { currentUser } = useAuthSession();

  const updateDocument = useCallback(
    async (documentId: string, updates: Partial<DocumentItem>, options: UpdateDocumentOptions = {}): Promise<void> => {
      if (!currentUser) throw new Error("User not authenticated");

      try {
        const db = (await getLocalDb(currentUser.uid)) as DocumentUpdateCapableDb;
        const skipSync = isViewerStateOnlyUpdate(updates);
        const shouldTouchUpdatedAt = shouldTouchUpdatedAtForUpdates(updates, options);
        const { updatedAt: requestedUpdatedAt, ...restUpdates } = updates;
        const payload: DocumentUpdatePayload = {
          ...(restUpdates as Record<string, unknown>),
          deviceId: currentUser.uid,
        };

        if (shouldTouchUpdatedAt) {
          payload.updatedAt = new Date();
        } else {
          const normalizedRequestedUpdatedAt = normalizeUpdatedAt(requestedUpdatedAt);
          if (normalizedRequestedUpdatedAt) {
            payload.updatedAt = normalizedRequestedUpdatedAt;
          }
        }

        await db.updateItem("documents", documentId, payload, skipSync);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[useDocumentCommands] Update error: ${message}`, {
          documentId,
          updates,
          options,
        });
        throw err;
      }
    },
    [currentUser],
  );

  const deleteDocument = useCallback(
    async (documentId: string): Promise<void> => {
      await updateDocument(documentId, { isDeleted: true }, { touchUpdatedAt: true });
    },
    [updateDocument],
  );

  const purgeDocument = useCallback(
    async (documentId: string): Promise<void> => {
      if (!currentUser) throw new Error("User not authenticated");

      const db = (await getLocalDb(currentUser.uid)) as DocumentPurgeCapableDb;
      const document = await db.documents.get(documentId);
      const localFileId = resolveDocumentFileId(documentId, document);

      await db.runSyncTransaction(async () => {
        await db.table("documentFiles").delete(localFileId);
        await db.documents.delete(documentId);
      });

      await db.queueDeleteSync({ entity: "document", targetId: documentId, priority: "high" });
      await deleteDocumentBlob(localFileId, { userId: currentUser.uid }).catch(() => undefined);
    },
    [currentUser],
  );

  return {
    updateDocument,
    deleteDocument,
    purgeDocument,
  };
};



export { useDocumentCommands };
