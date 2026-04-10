import { useCallback, useLayoutEffect, useMemo } from "react";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { buildExplorerBreadcrumbs } from "@/features/breadcrumbs/builders";
import type { ExplorerBreadcrumbContext } from "../contracts/explorerBreadcrumbContext";

type Params = {
  selectedFolderId: string | null;
  selectedItem: import("@/types").SelectedExplorerItem;
  explorerBreadcrumbContext: ExplorerBreadcrumbContext;
  folderById: Map<string, import("@/types").Folder>;
  cardById: Map<string, import("@/types").Card>;
  documentById: Map<string, import("@/types").DocumentItem>;
};

export const useExplorerBreadcrumbSync = ({
  selectedFolderId,
  selectedItem,
  explorerBreadcrumbContext,
  folderById,
  cardById,
  documentById,
}: Params) => {
  const { setExtraCrumbs } = useBreadcrumbContext();

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

  const onBreadcrumbContextChange = useCallback(
    (next: ExplorerBreadcrumbContext) => next,
    [],
  );

  return {
    onBreadcrumbContextChange,
  };
};
