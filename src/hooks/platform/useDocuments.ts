import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { DocumentItem } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useMemo, useState } from "react";

type DocumentWithLegacyDelete = DocumentItem & {
  is_deleted?: boolean;
};

/**
 * PDFドキュメントを取得・管理するためのフック
 */
export const useDocuments = (folderId?: string) => {
  const { currentUser } = useAuthSession();
  const [error, setError] = useState<string | null>(null);

  // useLiveQueryでドキュメントを取得
  const rawDocuments = useLiveQuery(async () => {
    try {
      if (!currentUser) return [];
      const db = await getLocalDb(currentUser.uid);
      // documentsテーブルから全件取得
      const all = await db.documents.toArray();
      return all;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[useDocuments] Error: ${message}`);
      setError(message);
      return [];
    }
  }, [currentUser]);

  // フィルタリングとソート
  const documents = useMemo(() => {
    if (!rawDocuments) return [];

    let filtered = rawDocuments.filter((d) => {
      const document = d as DocumentWithLegacyDelete;
      return !(document.isDeleted ?? document.is_deleted ?? false);
    });

    if (folderId) {
      filtered = filtered.filter((d) => d.folderId === folderId);
    }

    // orderIndexでソート
    return filtered.sort(
      (a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0),
    );
  }, [rawDocuments, folderId]);

  const loading = rawDocuments === undefined;

  // ドキュメント更新
  // ✅ スパース更新（必要なフィールドのみ更新）
  // viewerState など表示状態の更新時に、他のフィールドを上書きしない
  const updateDocument = useCallback(
    async (
      documentId: string,
      updates: Partial<DocumentItem>,
    ): Promise<void> => {
      if (!currentUser) throw new Error("User not authenticated");
      try {
        const db = await getLocalDb(currentUser.uid);
        const now = new Date();
        // ✅ db.documents.update() は Dexie のマージ更新
        // 指定されたフィールドのみ更新され、他のフィールドは保持される
        await db.documents.update(documentId, {
          ...updates,
          updatedAt: now,
          deviceId: currentUser.uid, // 簡略版（実装に応じて調整）
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[useDocuments] Update error: ${message}`, {
          documentId,
          updates,
        });
        throw err;
      }
    },
    [currentUser],
  );

  const deleteDocument = useCallback(
    async (documentId: string): Promise<void> => {
      await updateDocument(documentId, { isDeleted: true });
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
