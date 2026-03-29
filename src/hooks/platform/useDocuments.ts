import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDb } from "@/services/localDB";
import { useAuthSession } from "@/contexts/AuthContext";
import type { DocumentItem } from "@/types";

/**
 * PDFドキュメントを取得・管理するためのフック
 */
export function useDocuments(folderId?: string) {
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
      console.error(`[useDocuments] Error: ${err.message}`);
      setError(err.message);
      return [];
    }
  }, [currentUser]);

  // フィルタリングとソート
  const documents = useMemo(() => {
    if (!rawDocuments) return [];

    let filtered = rawDocuments.filter(
      (d) => !(d.isDeleted ?? (d as unknown).is_deleted),
    );

    if (folderId) {
      filtered = filtered.filter((d) => d.folderId === folderId);
    }

    // orderIndexでソート
    return filtered.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
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
        console.error(`[useDocuments] Update error: ${err.message}`, {
          documentId,
          updates,
        });
        throw err;
      }
    },
    [currentUser],
  );

  return {
    documents,
    loading,
    error,
    updateDocument,
  };
}





