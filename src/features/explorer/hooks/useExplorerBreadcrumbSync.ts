import { useLayoutEffect, useMemo } from "react";
import { useSetBreadcrumbCrumbs } from "@/contexts/BreadcrumbContext";
import { buildExplorerBreadcrumbs } from "@/features/breadcrumbs/builders";
import type { ExplorerBreadcrumbContext } from "@/features/explorer/contracts/explorerBreadcrumbContext";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";



type Params = {
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  explorerBreadcrumbContext: ExplorerBreadcrumbContext;
  folderById: Map<string, Folder>;
  cardById: Map<string, Card>;
  documentById: Map<string, DocumentItem>;
};



const useExplorerBreadcrumbSync = ({ selectedFolderId, selectedItem, explorerBreadcrumbContext, folderById, cardById, documentById }: Params) => {
  const setExtraCrumbs = useSetBreadcrumbCrumbs();

  const extraCrumbs = useMemo(
    () =>
      buildExplorerBreadcrumbs({
        selectedFolderId,
        explorerBreadcrumbContext,
        selectedItem,
        folderById,
        cardById,
        documentById,
      }),
    [
      cardById,
      documentById,
      explorerBreadcrumbContext,
      folderById,
      selectedFolderId,
      selectedItem,
    ],
  );

  useLayoutEffect(() => {
    setExtraCrumbs(extraCrumbs);
  }, [extraCrumbs, setExtraCrumbs]);
};



export { useExplorerBreadcrumbSync };
