import type { ExplorerBreadcrumbContext } from "@/features/explorer/contracts/explorerBreadcrumbContext";
import { EMPTY_EXPLORER_BREADCRUMB_CONTEXT } from "@/features/explorer/contracts/explorerBreadcrumbContext";
import type { ExplorerControllerState } from "@/features/explorer/contracts/explorerControllerState";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";



const createInitialExplorerState = (routeState: ExplorerRouteState): ExplorerControllerState => ({ isHomeOnlyMode: routeState.isHomeOnlyMode, isSectionListMode: routeState.isSectionListMode, selectedFolderId: routeState.isHomeOnlyMode || routeState.isSectionListMode ? null : routeState.selectedFolderId, selectedItem: routeState.isHomeOnlyMode || routeState.isSectionListMode ? null : routeState.selectedItem, folderSelectionNonce: 0, navigateToSectionListToken: 0, explorerBreadcrumbContext: EMPTY_EXPLORER_BREADCRUMB_CONTEXT });
const resetBreadcrumbContext = (): ExplorerBreadcrumbContext => EMPTY_EXPLORER_BREADCRUMB_CONTEXT;



export { createInitialExplorerState, resetBreadcrumbContext };
