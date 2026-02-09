import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';
import type { Document } from '../types';

/**
 * PDFドキュメントを取得・管理するためのフック
 */
export function useDocuments(folderId?: string) {
  const { currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // useLiveQueryでドキュメントを取得
  const rawDocuments = useLiveQuery(
    async () => {
      try {
        if (!currentUser) return [];
        const db = await getLocalDb(currentUser.uid);
        // documentsテーブルから全件取得
        const all = await db.documents.toArray();
        return all;
      } catch (err: any) {
        console.error(`[useDocuments] Error: ${err.message}`);
        setError(err.message);
        return [];
      }
    },
    [currentUser]
  );

  // フィルタリングとソート
  const documents = useMemo(() => {
    if (!rawDocuments) return [];

    let filtered = rawDocuments.filter(d => !d.isDeleted);

    if (folderId) {
      filtered = filtered.filter(d => d.folderId === folderId);
    }

    // orderIndexでソート
    return filtered.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [rawDocuments, folderId]);

  const loading = rawDocuments === undefined;

  return {
    documents,
    loading,
    error,
  };
}
