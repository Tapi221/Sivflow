import { useCallback } from "react";
import { useAuthSession } from "@/contexts/AuthContext";
import { deleteDocumentBlob } from "@/services/documentFileStore";
import { getLocalDb } from "@/services/localDB";
import { normalizeDate } from "@/shared/codec/date";
import type { DocumentItem } from "@/types";

type UpdateDocumentOptions = {
  touchUpdatedAt?: boolean;
};

type SyncDeleteCapableDb = Awaited<ReturnType<typeof getLocalDb>> & {
  queueDeleteSync?: (args: { entity: "document"; targetId: string; priority?: "critical" | "high" | "medium" | "low" }) => Promise<void>;
};

const normalizeUpdatedAt = (
  value: DocumentItem["updatedAt"] | undefined,
): Date | undefined => {
  return normalizeDate(value) ?? undefined;
};

const resolveDocumentFileId = (
  documentId: string,
  document: Pick<DocumentItem, "localFileId"> | undefined,
): string => {
  const localFileId = typeof document?.localFileId === "string" ? document.localFileId.trim() : "";
  return localFileId.length > 0 ? localFileId : documentId;
};

export const useDocumentCommands = () => {
  const { currentUser } = useAuthSession();

  const updateDocument = useCallback(
    async (
      documentId: string,
      updates: Partial<DocumentItem>,
      options: UpdateDocumentOptions = {},
    ): Promise<void> => {
      if (!currentUser) throw new Error("User not authenticated");

      try {
        const db = await getLocalDb(currentUser.uid);

        const shouldTouchUpdatedAt =
          options.touchUpdatedAt ??
          Object.keys(updates).some((key) => key !== "viewerState");

        const { updatedAt: requestedUpdatedAt, ...restUpdates } = updates;

        const payload: Partial<Omit<DocumentItem, "updatedAt">> & {
          deviceId: string;
          updatedAt?: Date;
        } = {
          ...restUpdates,
          deviceId: currentUser.uid,
        };

        if (shouldTouchUpdatedAt) {
          payload.updatedAt = new Date();
        } else {
          const normalizedRequestedUpdatedAt =
            normalizeUpdatedAt(requestedUpdatedAt);
          if (normalizedRequestedUpdatedAt) {
            payload.updatedAt = normalizedRequestedUpdatedAt;
          }
        }

        await db.documents.update(documentId, payload);
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
      await updateDocument(
        documentId,
        { isDeleted: true },
        { touchUpdatedAt: true },
      );
    },
    [updateDocument],
  );

  const purgeDocument = useCallback(
    async (documentId: string): Promise<void> => {
      if (!currentUser) throw new Error("User not authenticated");

      const db = await getLocalDb(currentUser.uid);
      const document = await db.documents.get(documentId);
      const localFileId = resolveDocumentFileId(documentId, document);

      await db.runSyncTransaction(async () => {
        await db.table("documentFiles").delete(localFileId);
        await db.documents.delete(documentId);
      });

      const syncDb = db as SyncDeleteCapableDb;
      if (typeof syncDb.queueDeleteSync === "function") {
        await syncDb.queueDeleteSync({ entity: "document", targetId: documentId, priority: "high" });
      }

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
