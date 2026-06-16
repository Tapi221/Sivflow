import { useCallback, useMemo, useReducer } from "react";
import type { ExplorerBreadcrumbContext } from "@/features/explorer/contracts/explorerBreadcrumbContext";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { explorerReducer } from "./explorerReducer";
import { createInitialExplorerState } from "./explorerState";
import type { SelectedExplorerItem } from "@/types";



type UseExplorerControllerParams = {
  initialRouteState: ExplorerRouteState;
};



const useExplorerController = ({ initialRouteState }: UseExplorerControllerParams) => {
  const [state, dispatch] = useReducer(explorerReducer, initialRouteState, createInitialExplorerState);

  const selectFolder = useCallback((folderId: string | null) => {
    dispatch({ type: "SELECT_FOLDER", payload: { folderId } });
  }, []);

  const selectItem = useCallback((item: SelectedExplorerItem) => {
    dispatch({ type: "SELECT_ITEM", payload: { item } });
  }, []);

  const applyRouteState = useCallback((nextRouteState: ExplorerRouteState) => {
    dispatch({ type: "APPLY_ROUTE_STATE", payload: nextRouteState });
  }, []);

  const setBreadcrumbContext = useCallback(
    (context: ExplorerBreadcrumbContext) => {
      dispatch({
        type: "SET_BREADCRUMB_CONTEXT",
        payload: { context },
      });
    },
    [],
  );

  const navigateToSectionList = useCallback(() => {
    dispatch({ type: "INCREMENT_SECTION_LIST_TOKEN" });
  }, []);

  const actions = useMemo(
    () => ({
      selectFolder,
      selectItem,
      applyRouteState,
      setBreadcrumbContext,
      navigateToSectionList,
    }),
    [
      selectFolder,
      selectItem,
      applyRouteState,
      setBreadcrumbContext,
      navigateToSectionList,
    ],
  );

  return useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions],
  );
};



export { useExplorerController };
