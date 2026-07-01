import { areExplorerBreadcrumbContextsEqual } from "@/features/explorer/contracts/explorerBreadcrumbContext";
import type { ExplorerControllerState } from "@/features/explorer/contracts/explorerControllerState";
import type { ExplorerAction } from "./explorerActionTypes";
import { resetBreadcrumbContext } from "./explorerState";
import { isSameSelectedExplorerItem } from "@/features/explorer/utils/isSameSelectedExplorerItem";
import type { SelectedExplorerItem } from "@/types";



const shouldClearSelectionFolder = (item: SelectedExplorerItem) =>
  item?.type === "gallery" ||
  item?.type === "calendar" ||
  item?.type === "trash";
const explorerReducer = (state: ExplorerControllerState, action: ExplorerAction): ExplorerControllerState => {
  switch (action.type) { case "APPLY_ROUTE_STATE": {
    const next = action.payload;

    const nextSelectedFolderId =
      next.isHomeOnlyMode || next.isSectionListMode
        ? null
        : next.selectedFolderId;
    const nextSelectedItem =
      next.isHomeOnlyMode || next.isSectionListMode
        ? null
        : next.selectedItem;

    const didSelectedFolderChange =
      state.selectedFolderId !== nextSelectedFolderId;
    const didSelectedItemChange = !isSameSelectedExplorerItem(
      state.selectedItem,
      nextSelectedItem,
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
    const nextFolderSelectionNonce = shouldIncrementFolderSelectionNonce
      ? state.folderSelectionNonce + 1
      : state.folderSelectionNonce;
    const nextNavigateToSectionListToken = shouldIncrementSectionListToken
      ? state.navigateToSectionListToken + 1
      : state.navigateToSectionListToken;
    const nextExplorerBreadcrumbContext = shouldResetBreadcrumbs
      ? resetBreadcrumbContext()
      : state.explorerBreadcrumbContext;

    const isStateUnchanged =
      state.isHomeOnlyMode === next.isHomeOnlyMode &&
        state.isSectionListMode === next.isSectionListMode &&
        state.selectedFolderId === nextSelectedFolderId &&
        isSameSelectedExplorerItem(state.selectedItem, nextSelectedItem) &&
        state.folderSelectionNonce === nextFolderSelectionNonce &&
        state.navigateToSectionListToken === nextNavigateToSectionListToken &&
        areExplorerBreadcrumbContextsEqual(
          state.explorerBreadcrumbContext,
          nextExplorerBreadcrumbContext,
        );

    if (isStateUnchanged) {
      return state;
    }

    return {
      ...state,
      isHomeOnlyMode: next.isHomeOnlyMode,
      isSectionListMode: next.isSectionListMode,
      selectedFolderId: nextSelectedFolderId,
      selectedItem: nextSelectedItem,
      folderSelectionNonce: nextFolderSelectionNonce,
      navigateToSectionListToken: nextNavigateToSectionListToken,
      explorerBreadcrumbContext: nextExplorerBreadcrumbContext,
    };
  }

    case "SELECT_FOLDER": {
      const isSectionListMode = action.payload.folderId === null;
      const nextSelectedFolderId = isSectionListMode
        ? null
        : action.payload.folderId;
      const nextFolderSelectionNonce = isSectionListMode
        ? state.folderSelectionNonce
        : state.folderSelectionNonce + 1;
      const nextNavigateToSectionListToken = isSectionListMode
        ? state.navigateToSectionListToken + 1
        : state.navigateToSectionListToken;
      const nextExplorerBreadcrumbContext = resetBreadcrumbContext();

      const isStateUnchanged =
        state.isHomeOnlyMode === false &&
        state.isSectionListMode === isSectionListMode &&
        state.selectedFolderId === nextSelectedFolderId &&
        state.selectedItem === null &&
        state.folderSelectionNonce === nextFolderSelectionNonce &&
        state.navigateToSectionListToken === nextNavigateToSectionListToken &&
        areExplorerBreadcrumbContextsEqual(
          state.explorerBreadcrumbContext,
          nextExplorerBreadcrumbContext,
        );

      if (isStateUnchanged) {
        return state;
      }

      return {
        ...state,
        isHomeOnlyMode: false,
        isSectionListMode,
        selectedFolderId: nextSelectedFolderId,
        selectedItem: null,
        folderSelectionNonce: nextFolderSelectionNonce,
        navigateToSectionListToken: nextNavigateToSectionListToken,
        explorerBreadcrumbContext: nextExplorerBreadcrumbContext,
      };
    }

    case "SELECT_ITEM": {
      const shouldResetFolder = shouldClearSelectionFolder(action.payload.item);
      const nextSelectedFolderId = shouldResetFolder
        ? null
        : state.selectedFolderId;
      const nextExplorerBreadcrumbContext = shouldResetFolder
        ? resetBreadcrumbContext()
        : state.explorerBreadcrumbContext;

      const isStateUnchanged =
        state.isHomeOnlyMode === false &&
        state.isSectionListMode === false &&
        isSameSelectedExplorerItem(state.selectedItem, action.payload.item) &&
        state.selectedFolderId === nextSelectedFolderId &&
        areExplorerBreadcrumbContextsEqual(
          state.explorerBreadcrumbContext,
          nextExplorerBreadcrumbContext,
        );

      if (isStateUnchanged) {
        return state;
      }

      return {
        ...state,
        isHomeOnlyMode: false,
        isSectionListMode: false,
        selectedItem: action.payload.item,
        selectedFolderId: nextSelectedFolderId,
        explorerBreadcrumbContext: nextExplorerBreadcrumbContext,
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



export { explorerReducer };
