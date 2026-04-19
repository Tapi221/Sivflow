import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { DocumentItem } from "@/types";

type DocumentWithLegacyDelete = DocumentItem & {
  is_deleted?: boolean;
};

export const useDocumentsRead = (folderId?: string) => {
  const { currentUser } = useAuthSession();
  const [error, setError] = useState<string | null>(null);

  const rawDocuments = useLiveQuery(async () => {
    try {
      if (!currentUser) return [];
      const db = await getLocalDb(currentUser.uid);
      const allDocuments = await db.documents.toArray();
      return allDocuments;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[useDocumentsRead] Error: ${message}`);
      setError(message);
      return [];
    }
  }, [currentUser]);

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
      (left, right) =>
        (Number(left.orderIndex) || 0) - (Number(right.orderIndex) || 0),
    );
  }, [rawDocuments, folderId]);

  return {
    documents,
    loading: rawDocuments === undefined,
    error,
  };
};
