import { buildExplorerBreadcrumbs } from "@/features/breadcrumbs/builders";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import type { ExplorerBreadcrumbContext } from "../contracts/explorerBreadcrumbContext";

type UseExplorerBreadcrumbSyncParams = {
  setExtraCrumbs: (crumbs: unknown[]) => void;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  explorerBreadcrumbContext: ExplorerBreadcrumbContext;
  folderById: Map<string, Folder>;
  cardById: Map<string, Card>;
  documentById: Map<string, DocumentItem>;
};

export const useExplorerBreadcrumbSync = ({
  setExtraCrumbs,
  selectedFolderId,
  selectedItem,
  explorerBreadcrumbContext,
  folderById,
  cardById,
  documentById,
}: UseExplorerBreadcrumbSyncParams) => {
  const extraCrumbs = buildExplorerBreadcrumbs({
    selectedFolderId,
    explorerBreadcrumbContext,
    selectedItem,
    folderById,
    cardById,
    documentById,
  });

  setExtraCrumbs(extraCrumbs);
};
