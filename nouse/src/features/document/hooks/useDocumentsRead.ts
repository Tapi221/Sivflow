import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffectiveLocalUserId } from "@/contexts/auth/useEffectiveLocalUserId";
import { getLocalDb } from "@/services/localdb";
import type { DocumentItem } from "@/types";



type DocumentWithLegacyDelete = DocumentItem & {
  is_deleted?: boolean;
};
type UseDocumentsReadOptions = {
  enabled?: boolean;
};



const getDocumentOrderIndex = (document: DocumentItem): number => {
  const orderIndex = Number(document.orderIndex);
  return Number.isFinite(orderIndex) ? orderIndex : 0;
};
const useDocumentsRead = (folderId?: string, options?: UseDocumentsReadOptions) => {
  const userId = useEffectiveLocalUserId();
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;

  const rawDocuments = useLiveQuery(async () => {
    try {
      if (!enabled) return [];
      if (!userId) return [];
      const db = await getLocalDb(userId);
      const allDocuments = await db.documents.toArray();
      return allDocuments;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[useDocumentsRead] Error: ${message}`);
      setError(message);
      return [];
    }
  }, [enabled, userId]);

  const documents = useMemo(() => {
    if (!rawDocuments) return [];

    let filtered = rawDocuments.filter((document) => {
      const nextDocument = document as DocumentWithLegacyDelete;
      return !(nextDocument.isDeleted ?? nextDocument.is_deleted ?? false);
    });

    if (folderId) {
      filtered = filtered.filter((document) => document.folderId === folderId);
    }

    return filtered.sort(
      (left, right) => getDocumentOrderIndex(left) - getDocumentOrderIndex(right),
    );
  }, [rawDocuments, folderId]);

  return {
    documents,
    loading: enabled && rawDocuments === undefined,
    error,
  };
};



export { useDocumentsRead };
