import { useEffect, useRef } from "react";
import { isSameSelectedExplorerItem } from "../utils/isSameSelectedExplorerItem";
import { mapExplorerSelectionToSearchParams } from "../mappers/mapExplorerSelectionToSearchParams";
import type { FoldersRouteAdapter } from "../adapters/web/useFoldersRouteAdapter";

type Params = {
  route: FoldersRouteAdapter;
  selectedFolderId: string | null;
  selectedItem: import("@/types").SelectedExplorerItem;
  applyRouteState: (next: import("../contracts/explorerRouteState").ExplorerRouteState) => void;
};

export const useExplorerRouteSync = ({
  route,
  selectedFolderId,
  selectedItem,
  applyRouteState,
}: Params) => {
  const lastWrittenQueryRef = useRef<string | null>(null);

  useEffect(() => {
    const current = route.readRouteState();

    if (
      current.selectedFolderId === selectedFolderId &&
      isSameSelectedExplorerItem(current.selectedItem, selectedItem)
    ) {
      return;
    }

    const next = mapExplorerSelectionToSearchParams({
      baseSearchParams: route.getBaseSearchParams(),
      selectedFolderId,
      selectedItem,
    });

    const nextQuery = next.toString();

    if (lastWrittenQueryRef.current === nextQuery) {
      return;
    }

    lastWrittenQueryRef.current = nextQuery;
    route.writeRouteState(next);
  }, [route, selectedFolderId, selectedItem]);

  useEffect(() => {
    const routeState = route.readRouteState();
    const currentQuery = route.getBaseSearchParams().toString();

    if (lastWrittenQueryRef.current === currentQuery) {
      lastWrittenQueryRef.current = null;
      return;
    }

    applyRouteState(routeState);
  }, [applyRouteState, route, route.routeKey]);
};
