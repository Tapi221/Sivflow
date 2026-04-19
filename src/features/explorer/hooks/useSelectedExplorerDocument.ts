import { useLiveQuery } from "dexie-react-hooks";

import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";

export const useSelectedExplorerDocument = (documentId: string | null) => {
  const { currentUser } = useAuthSession();

  const document = useLiveQuery(
    async () => {
      if (!currentUser || !documentId) {
        return null;
      }

      const db = await getLocalDb(currentUser.uid);
      const rawDocument = await db.documents.get(documentId);
      if (!rawDocument || rawDocument.isDeleted) {
        return null;
      }

      return rawDocument;
    },
    [currentUser?.uid, documentId],
    null,
  );

  return {
    document: document ?? null,
    loading: Boolean(documentId) && document === undefined,
  };
};
