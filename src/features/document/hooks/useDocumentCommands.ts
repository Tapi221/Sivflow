import { useCallback } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { deleteDocumentBlob } from "@/services/documentFileStore";
import { getLocalDb } from "@/services/localdb";
import { normalizeDate } from "@/shared/codec/date";
import type { DocumentItem } from "@/types";

type UpdateDocumentOptions = {
  touchUpdatedAt?: boolean;
};

type DocumentUpdatePayload = Record<string, unknown> & {
  deviceId: string;
  updatedAt?: Date;
};

type DocumentUpdateCapableDb = Awaited<ReturnType<typeof getLocalDb>> & {
  updateItem: (table: "documents", id: string, changes: Record<string, unknown>) => Promise<number>;
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
  queueDeleteSync: (args: { entity: "document"; targetId: string; priority?: "critical" | "high" | "medium" | "low" }) => Promise<void>;
};

const normalizeUpdatedAt = (value: DocumentItem["updatedAt"] | undefined): Date | undefined => {
  return normalizeDate(value) ?? undefined;
};

const resolveDocumentFileId = (documentId: string, document: Pick<DocumentItem, "localFileId"> | undefined): string => {
  const localFileId = typeof document?.localFileId === "string" ? document.localFileId.trim() : "";
  return localFileId.length > 0 ? localFileId : documentId;
};

export const useDocumentCommands = () => {
  const { currentUser } = useAuthSession();

  const updateDocument = useCallback(
    async (documentId: string, updates: Partial<DocumentItem>, options: UpdateDocumentOptions = {}): Promise<void> => {
      if (!currentUser) throw new Error("User not authenticated");

      try {
        const db = (await getLocalDb(currentUser.uid)) as DocumentUpdateCapableDb;
        const shouldTouchUpdatedAt = options.touchUpdatedAt ?? Object.keys(updates).some((key) => key !== "viewerState");
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

        await db.updateItem("documents", documentId, payload);
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