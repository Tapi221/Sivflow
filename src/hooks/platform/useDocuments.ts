import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { DocumentItem } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useMemo, useState } from "react";

type DocumentWithLegacyDelete = DocumentItem & {
  is_deleted?: boolean;
};

type UpdateDocumentOptions = {
  /**
   * true のときは updatedAt を明示的に更新する。
   * false のときは updatedAt を変更しない。
   * 未指定時は viewerState 以外のフィールド更新でのみ updatedAt を更新する。
   */
  touchUpdatedAt?: boolean;
};

type TimestampLike = {
  toDate: () => Date;
};

const isTimestampLike = (value: unknown): value is TimestampLike =>
  typeof value === "object" &&
  value !== null &&
  "toDate" in value &&
  typeof (value as { toDate?: unknown }).toDate === "function";

const normalizeUpdatedAt = (
  value: DocumentItem["updatedAt"] | undefined,
): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (isTimestampLike(value)) {
    const nextDate = value.toDate();
    return nextDate instanceof Date ? nextDate : undefined;
  }
  if (typeof value === "string" || typeof value === "number") {
    const nextDate = new Date(value);
    return Number.isNaN(nextDate.getTime()) ? undefined : nextDate;
  }
  return undefined;
};

/**
 * PDFドキュメントを取得・管理するためのフック
 */
export const useDocuments = (folderId?: string) => {
  const { currentUser } = useAuthSession();
  const [error, setError] = useState<string | null>(null);

  const rawDocuments = useLiveQuery(async () => {
    try {
      if (!currentUser) return [];
      const db = await getLocalDb(currentUser.uid);
      const all = await db.documents.toArray();
      return all;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[useDocuments] Error: ${message}`);
      setError(message);
      return [];
    }
  }, [currentUser]);

  const documents = useMemo(() => {
    if (!rawDocuments) return [];

    let filtered = rawDocuments.filter((d) => {
      const document = d as DocumentWithLegacyDelete;
      return !(document.isDeleted ?? document.is_deleted ?? false);
    });

    if (folderId) {
      filtered = filtered.filter((d) => d.folderId === folderId);
    }

    return filtered.sort(
      (a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0),
    );
  }, [rawDocuments, folderId]);

  const loading = rawDocuments === undefined;

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
        console.error(`[useDocuments] Update error: ${message}`, {
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
    documents,
    loading,
    error,
    updateDocument,
    deleteDocument,
  };
};
