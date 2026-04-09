import { useMemo, useReducer } from "react";
import { explorerReducer } from "./explorerReducer";
import { createInitialExplorerState } from "./explorerState";
import type { ExplorerBreadcrumbContext } from "../contracts/explorerBreadcrumbContext";
import type { SelectedExplorerItem } from "../contracts/explorerSelection";

export const useExplorerController = () => {
  const [state, dispatch] = useReducer(
    explorerReducer,
    undefined,
    createInitialExplorerState,
  );

  const actions = useMemo(
    () => ({
      selectFolder: (folderId: string | null) => {
        dispatch({ type: "SELECT_FOLDER", payload: { folderId } });
      },
      selectItem: (item: SelectedExplorerItem) => {
        dispatch({ type: "SELECT_ITEM", payload: { item } });
      },
      setBreadcrumbContext: (context: ExplorerBreadcrumbContext) => {
        dispatch({ type: "SET_BREADCRUMB_CONTEXT", payload: { context } });
      },
      resetForHomeMode: () => {
        dispatch({ type: "RESET_FOR_HOME_MODE" });
      },
      navigateToSectionList: () => {
        dispatch({ type: "NAVIGATE_TO_SECTION_LIST" });
      },
    }),
    [],
  );

  return { state, actions };
};
