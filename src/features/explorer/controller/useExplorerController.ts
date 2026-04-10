import { useCallback, useMemo, useReducer } from "react";
import type { SelectedExplorerItem } from "@/types";
import type { ExplorerBreadcrumbContext } from "../contracts/explorerBreadcrumbContext";
import type { ExplorerRouteState } from "../contracts/explorerRouteState";
import { explorerReducer } from "./explorerReducer";
import { createInitialExplorerState } from "./explorerState";

type UseExplorerControllerParams = {
  initialRouteState: ExplorerRouteState;
  onOpenSettings: () => void;
};

export const useExplorerController = ({
  initialRouteState,
  onOpenSettings,
}: UseExplorerControllerParams) => {
  const [state, dispatch] = useReducer(
    explorerReducer,
    initialRouteState,
    createInitialExplorerState,
  );

  const selectFolder = useCallback((folderId: string | null) => {
    dispatch({ type: "SELECT_FOLDER", payload: { folderId } });
  }, []);

  const selectItem = useCallback(
    (item: SelectedExplorerItem) => {
      if (item?.type === "settings") {
        onOpenSettings();
        return;
      }

      dispatch({ type: "SELECT_ITEM", payload: { item } });
    },
    [onOpenSettings],
  );

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

  return useMemo(
    () => ({
      state,
      actions: {
        selectFolder,
        selectItem,
        applyRouteState,
        setBreadcrumbContext,
        navigateToSectionList,
      },
    }),
    [
      applyRouteState,
      navigateToSectionList,
      selectFolder,
      selectItem,
      setBreadcrumbContext,
      state,
    ],
  );
};
