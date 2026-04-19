import { useCallback } from "react";

import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import { normalizeDate } from "@/shared/codec/date";
import type { DocumentItem } from "@/types";

type UpdateDocumentOptions = {
  touchUpdatedAt?: boolean;
};

const normalizeUpdatedAt = (
  value: DocumentItem["updatedAt"] | undefined,
): Date | undefined => {
  return normalizeDate(value) ?? undefined;
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

  return {
    updateDocument,
    deleteDocument,
  };
};
