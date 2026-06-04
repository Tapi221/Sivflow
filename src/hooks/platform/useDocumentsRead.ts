import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/AuthContext";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { getLocalDb } from "@/services/localDB";
import type { DocumentItem } from "@/types";

type DocumentWithLegacyDelete = DocumentItem & {
  is_deleted?: boolean;
};

type UseDocumentsReadOptions = {
  enabled?: boolean;
};

export const useDocumentsRead = (
  folderId?: string,
  options?: UseDocumentsReadOptions,
) => {
  const { currentUser } = useAuthSession();
  const userId = currentUser?.uid ?? null;
  const [error, setError] = useState<string | null>(null);
  const isActiveWorkspaceCardSetSelected = useWorkspaceTabsStore((state) => {
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
    return activeTab?.kind === "explorer" && activeTab.explorerState.selectedItem?.type === "cardSet";
  });
  const isUnscopedRead = !folderId;
  const enabled = (options?.enabled ?? true) && !(isUnscopedRead && isActiveWorkspaceCardSetSelected);

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
      (left, right) =>
        (Number(left.orderIndex) || 0) - (Number(right.orderIndex) || 0),
    );
  }, [rawDocuments, folderId]);

  return {
    documents,
    loading: enabled && rawDocuments === undefined,
    error,
  };
};