import type { ExplorerBreadcrumbContext } from "../contracts/explorerBreadcrumbContext";
import type { ExplorerRouteState } from "../contracts/explorerRouteState";
import type { SelectedExplorerItem } from "../contracts/explorerSelection";
import type { ExplorerControllerState } from "../contracts/explorerControllerState";

export type ExplorerReducerAction =
  | { type: "APPLY_ROUTE_STATE"; payload: ExplorerRouteState }
  | { type: "SELECT_FOLDER"; payload: { folderId: string | null } }
  | { type: "SELECT_ITEM"; payload: { item: SelectedExplorerItem } }
  | {
      type: "SET_BREADCRUMB_CONTEXT";
      payload: { context: ExplorerBreadcrumbContext };
    }
  | { type: "RESET_FOR_HOME_MODE" }
  | { type: "NAVIGATE_TO_SECTION_LIST" };

export const explorerReducer = (
  state: ExplorerControllerState,
  action: ExplorerReducerAction,
): ExplorerControllerState => {
  switch (action.type) {
    case "APPLY_ROUTE_STATE":
      return {
        ...state,
        isHomeOnlyMode: action.payload.isHomeOnlyMode,
        selectedFolderId: action.payload.folderId,
        selectedItem: action.payload.selectedItem,
      };

    case "SELECT_FOLDER":
      return {
        ...state,
        selectedFolderId: action.payload.folderId,
        selectedItem: null,
        folderSelectionNonce: state.folderSelectionNonce + 1,
      };

    case "SELECT_ITEM":
      return {
        ...state,
        selectedItem: action.payload.item,
      };

    case "SET_BREADCRUMB_CONTEXT":
      return {
        ...state,
        explorerBreadcrumbContext: action.payload.context,
      };

    case "RESET_FOR_HOME_MODE":
      return {
        ...state,
        isHomeOnlyMode: true,
        selectedFolderId: null,
        selectedItem: null,
      };

    case "NAVIGATE_TO_SECTION_LIST":
      return {
        ...state,
        navigateToSectionListToken: state.navigateToSectionListToken + 1,
      };

    default:
      return state;
  }
};
