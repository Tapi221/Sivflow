import { mapExplorerSelectionToSearchParams } from "@/features/explorer/mappers/mapExplorerSelectionToSearchParams";
import type { WorkspaceTab } from "@/features/workspace-tabs/domain/workspaceTab";

const buildFoldersPath = (searchParams: URLSearchParams) => {
  const query = searchParams.toString();

  return query ? `/folders?${query}` : "/folders";
};

export const resolveWorkspaceTabRoute = (tab: WorkspaceTab): string => {
  if (tab.kind === "route") {
    return tab.routePath;
  }

  if (tab.kind === "explorer") {
    const searchParams = mapExplorerSelectionToSearchParams({
      isHomeOnlyMode: tab.explorerState.isHomeOnlyMode,
      isSectionListMode: tab.explorerState.isSectionListMode,
      selectedFolderId: tab.explorerState.selectedFolderId,
      selectedItem: tab.explorerState.selectedItem,
    });

    return buildFoldersPath(searchParams);
  }

  if (tab.kind === "document") {
    const searchParams = new URLSearchParams();
    searchParams.set("docId", tab.documentId);
    return buildFoldersPath(searchParams);
  }

  if (tab.kind === "cardSet") {
    const searchParams = new URLSearchParams();
    searchParams.set("cardSetId", tab.cardSetId);
    return buildFoldersPath(searchParams);
  }

  const searchParams = new URLSearchParams();
  searchParams.set("cardId", tab.cardId);

  return buildFoldersPath(searchParams);
};
