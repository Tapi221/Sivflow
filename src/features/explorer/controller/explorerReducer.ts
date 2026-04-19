import { areExplorerBreadcrumbContextsEqual } from "@/features/explorer/contracts/explorerBreadcrumbContext";
import type { ExplorerControllerState } from "@/features/explorer/contracts/explorerControllerState";
import { isSameSelectedExplorerItem } from "@/features/explorer/utils/isSameSelectedExplorerItem";
import type { SelectedExplorerItem } from "@/types";
import type { ExplorerAction } from "./explorerActionTypes";
import { resetBreadcrumbContext } from "./explorerState";

const shouldClearSelectionFolder = (item: SelectedExplorerItem) =>
  item?.type === "directory" ||
  item?.type === "gallery" ||
  item?.type === "calendar" ||
  item?.type === "trash";

export const explorerReducer = (
  state: ExplorerControllerState,
  action: ExplorerAction,
): ExplorerControllerState => {
  switch (action.type) {
    case "APPLY_ROUTE_STATE": {
      const next = action.payload;
      const didSelectedFolderChange = state.selectedFolderId !== next.selectedFolderId;
      const didSelectedItemChange = !isSameSelectedExplorerItem(
        state.selectedItem,
        next.selectedItem,
      );

      const shouldIncrementSectionListToken =
        next.isSectionListMode &&
        (!state.isSectionListMode ||
          state.isHomeOnlyMode ||
          didSelectedFolderChange ||
          didSelectedItemChange);

      const shouldIncrementFolderSelectionNonce =
        !next.isHomeOnlyMode &&
        !next.isSectionListMode &&
        (state.isHomeOnlyMode ||
          state.isSectionListMode ||
          didSelectedFolderChange ||
          didSelectedItemChange);

      const shouldResetBreadcrumbs =
        next.isHomeOnlyMode ||
        next.isSectionListMode ||
        didSelectedFolderChange ||
        didSelectedItemChange;

      return {
        ...state,
        isHomeOnlyMode: next.isHomeOnlyMode,
        isSectionListMode: next.isSectionListMode,
        selectedFolderId:
          next.isHomeOnlyMode || next.isSectionListMode
            ? null
            : next.selectedFolderId,
        selectedItem:
          next.isHomeOnlyMode || next.isSectionListMode
            ? null
            : next.selectedItem,
        folderSelectionNonce: shouldIncrementFolderSelectionNonce
          ? state.folderSelectionNonce + 1
          : state.folderSelectionNonce,
        navigateToSectionListToken: shouldIncrementSectionListToken
          ? state.navigateToSectionListToken + 1
          : state.navigateToSectionListToken,
        explorerBreadcrumbContext: shouldResetBreadcrumbs
          ? resetBreadcrumbContext()
          : state.explorerBreadcrumbContext,
      };
    }

    case "SELECT_FOLDER": {
      const isSectionListMode = action.payload.folderId === null;

      return {
        ...state,
        isHomeOnlyMode: false,
        isSectionListMode,
        selectedFolderId: isSectionListMode ? null : action.payload.folderId,
        selectedItem: null,
        folderSelectionNonce: isSectionListMode
          ? state.folderSelectionNonce
          : state.folderSelectionNonce + 1,
        navigateToSectionListToken: isSectionListMode
          ? state.navigateToSectionListToken + 1
          : state.navigateToSectionListToken,
        explorerBreadcrumbContext: resetBreadcrumbContext(),
      };
    }

    case "SELECT_ITEM": {
      const shouldResetFolder = shouldClearSelectionFolder(action.payload.item);

      return {
        ...state,
        isHomeOnlyMode: false,
        isSectionListMode: false,
        selectedItem: action.payload.item,
        selectedFolderId: shouldResetFolder ? null : state.selectedFolderId,
        explorerBreadcrumbContext: shouldResetFolder
          ? resetBreadcrumbContext()
          : state.explorerBreadcrumbContext,
      };
    }

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
        isHomeOnlyMode: false,
        isSectionListMode: true,
        selectedFolderId: null,
        selectedItem: null,
        navigateToSectionListToken: state.navigateToSectionListToken + 1,
        explorerBreadcrumbContext: resetBreadcrumbContext(),
      };

    default:
      return state;
  }
};
