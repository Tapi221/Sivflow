import { useEffect, useRef } from "react";
import type { SelectedExplorerItem } from "@/types";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import type { FoldersRouteAdapter } from "../adapters/web/useFoldersRouteAdapter";
import { mapExplorerSelectionToSearchParams } from "../mappers/mapExplorerSelectionToSearchParams";
import { isSameSelectedExplorerItem } from "../utils/isSameSelectedExplorerItem";

type Params = {
  route: FoldersRouteAdapter;
  isHomeOnlyMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  applyRouteState: (next: ExplorerRouteState) => void;
};

const areRouteStatesEqual = (
  a: ExplorerRouteState,
  b: ExplorerRouteState,
): boolean =>
  a.isHomeOnlyMode === b.isHomeOnlyMode &&
  a.selectedFolderId === b.selectedFolderId &&
  isSameSelectedExplorerItem(a.selectedItem, b.selectedItem);

export const useExplorerRouteSync = ({
  route,
  isHomeOnlyMode,
  selectedFolderId,
  selectedItem,
  applyRouteState,
}: Params) => {
  const pendingQueryRef = useRef<string | null>(null);
  const timerRef = useRef(0);

  useEffect(() => {
    const currentRouteState = route.readRouteState();
    const nextRouteState: ExplorerRouteState = {
      isHomeOnlyMode,
      selectedFolderId,
      selectedItem,
    };

    if (areRouteStatesEqual(currentRouteState, nextRouteState)) {
      const currentQuery = route.getBaseSearchParams().toString();

      if (pendingQueryRef.current === currentQuery) {
        pendingQueryRef.current = null;
      }

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = 0;
      }
      return;
    }

    const nextSearchParams = mapExplorerSelectionToSearchParams({
      baseSearchParams: route.getBaseSearchParams(),
      isHomeOnlyMode,
      selectedFolderId,
      selectedItem,
    });

    const targetQuery = nextSearchParams.toString();
    const currentQuery = route.getBaseSearchParams().toString();

    if (targetQuery === currentQuery) {
      if (pendingQueryRef.current === currentQuery) {
        pendingQueryRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }

    pendingQueryRef.current = targetQuery;

    timerRef.current = window.setTimeout(() => {
      route.writeRouteState(nextSearchParams);
    }, 90);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = 0;
      }
    };
  }, [isHomeOnlyMode, route, selectedFolderId, selectedItem]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const currentQuery = route.getBaseSearchParams().toString();
      const pendingQuery = pendingQueryRef.current;

      if (pendingQuery !== null) {
        if (currentQuery !== pendingQuery) {
          return;
        }

        pendingQueryRef.current = null;
        return;
      }

      const externalRouteState = route.readRouteState();
      const localRouteState: ExplorerRouteState = {
        isHomeOnlyMode,
        selectedFolderId,
        selectedItem,
      };

      if (areRouteStatesEqual(externalRouteState, localRouteState)) {
        return;
      }

      applyRouteState(externalRouteState);
    });

    return () => {
      cancelled = true;
    };
  }, [
    applyRouteState,
    isHomeOnlyMode,
    route,
    route.routeKey,
    selectedFolderId,
    selectedItem,
  ]);
};
