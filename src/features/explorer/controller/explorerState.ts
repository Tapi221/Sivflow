import {
  EMPTY_EXPLORER_BREADCRUMB_CONTEXT,
  type ExplorerBreadcrumbContext,
} from "../contracts/explorerBreadcrumbContext";
import type { ExplorerControllerState } from "../contracts/explorerControllerState";
import type { ExplorerRouteState } from "../contracts/explorerRouteState";

export const createInitialExplorerState = (
  routeState: ExplorerRouteState,
): ExplorerControllerState => ({
  isHomeOnlyMode: routeState.isHomeOnlyMode,
  selectedFolderId: routeState.isHomeOnlyMode
    ? null
    : routeState.selectedFolderId,
  selectedItem: routeState.isHomeOnlyMode ? null : routeState.selectedItem,
  folderSelectionNonce: 0,
  navigateToSectionListToken: 0,
  explorerBreadcrumbContext: EMPTY_EXPLORER_BREADCRUMB_CONTEXT,
});

export const resetBreadcrumbContext = (): ExplorerBreadcrumbContext =>
  EMPTY_EXPLORER_BREADCRUMB_CONTEXT;
