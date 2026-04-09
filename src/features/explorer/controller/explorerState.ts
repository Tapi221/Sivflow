import type { ExplorerBreadcrumbContext } from "../contracts/explorerBreadcrumbContext";
import type { ExplorerControllerState } from "../contracts/explorerControllerState";
import { EMPTY_EXPLORER_BREADCRUMB_CONTEXT } from "../contracts/explorerBreadcrumbContext";

export const createInitialExplorerState = (): ExplorerControllerState => {
  return {
    isHomeOnlyMode: false,
    selectedFolderId: null,
    selectedItem: null,
    folderSelectionNonce: 0,
    navigateToSectionListToken: 0,
    explorerBreadcrumbContext: EMPTY_EXPLORER_BREADCRUMB_CONTEXT as ExplorerBreadcrumbContext,
  };
};
