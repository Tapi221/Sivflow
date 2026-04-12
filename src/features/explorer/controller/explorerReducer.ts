import { areExplorerBreadcrumbContextsEqual } from "@/features/explorer/contracts/explorerBreadcrumbContext";
import type { ExplorerControllerState } from "@/features/explorer/contracts/explorerControllerState";
import type { ExplorerAction } from "./explorerActionTypes";
import { resetBreadcrumbContext } from "./explorerState";

export const explorerReducer = (
  state: ExplorerControllerState,
  action: ExplorerAction,
): ExplorerControllerState => {
  switch (action.type) {
    case "APPLY_ROUTE_STATE": {
      const next = action.payload;

      if (next.isHomeOnlyMode) {
        return {
          ...state,
          isHomeOnlyMode: true,
          selectedFolderId: null,
          selectedItem: null,
          explorerBreadcrumbContext: resetBreadcrumbContext(),
        };
      }

      return {
        ...state,
        isHomeOnlyMode: false,
        selectedFolderId: next.selectedFolderId,
        selectedItem: next.selectedItem,
      };
    }

    case "SELECT_FOLDER":
      return {
        ...state,
        isHomeOnlyMode: false,
        selectedFolderId: action.payload.folderId,
        selectedItem: null,
        folderSelectionNonce: state.folderSelectionNonce + 1,
        explorerBreadcrumbContext: resetBreadcrumbContext(),
      };

    case "SELECT_ITEM":
      return {
        ...state,
        isHomeOnlyMode: false,
        selectedItem: action.payload.item,
        selectedFolderId:
          action.payload.item?.type === "directory" ||
          action.payload.item?.type === "gallery" ||
          action.payload.item?.type === "calendar" ||
          action.payload.item?.type === "trash"
            ? null
            : state.selectedFolderId,
        explorerBreadcrumbContext:
          action.payload.item?.type === "directory" ||
          action.payload.item?.type === "gallery" ||
          action.payload.item?.type === "calendar" ||
          action.payload.item?.type === "trash"
            ? resetBreadcrumbContext()
            : state.explorerBreadcrumbContext,
      };

    case "SET_BREADCRUMB_CONTEXT":
      return areExplorerBreadcrumbContextsEqual(
        state.explorerBreadcrumbContext,
        action.payload.context,
      )
        ? state
        : {
            ...state,
            explorerBreadcrumbContext: action.payload.context,
          };

    case "INCREMENT_SECTION_LIST_TOKEN":
      return {
        ...state,
        navigateToSectionListToken: state.navigateToSectionListToken + 1,
      };

    default:
      return state;
  }
};
