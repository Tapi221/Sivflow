import { mapExplorerSelectionToSearchParams } from "@/features/explorer/mappers/mapExplorerSelectionToSearchParams";
import type { WorkspaceTab } from "@/features/tab/Tab";

const buildLibraryPath = (searchParams: URLSearchParams) => {
  const query = searchParams.toString();
  return query ? `/library?${query}` : "/library";
};

export const resolveWorkspaceTabRoute = (tab: WorkspaceTab): string => {
  switch (tab.kind) {
    case "route":
      return tab.routePath;
    case "explorer":
      return buildLibraryPath(
        mapExplorerSelectionToSearchParams({
          isHomeOnlyMode: tab.explorerState.isHomeOnlyMode,
          isSectionListMode: tab.explorerState.isSectionListMode,
          selectedFolderId: tab.explorerState.selectedFolderId,
          selectedItem: tab.explorerState.selectedItem,
        }),
      );
    case "document": {
      const searchParams = new URLSearchParams();
      searchParams.set("docId", tab.documentId);
      return buildLibraryPath(searchParams);
    }
    case "card": {
      const searchParams = new URLSearchParams();
      searchParams.set("cardId", tab.cardId);
      return buildLibraryPath(searchParams);
    }
  }
};
