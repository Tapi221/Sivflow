import { useEffect, useRef } from "react";
import type { SelectedExplorerItem } from "@/types";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import type { FoldersRouteAdapter } from "@/features/explorer/adapters/web/useFoldersRouteAdapter";
import { mapExplorerSelectionToSearchParams } from "@/features/explorer/mappers/mapExplorerSelectionToSearchParams";
import { isSameSelectedExplorerItem } from "@/features/explorer/utils/isSameSelectedExplorerItem";

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
  const previousRouteKeyRef = useRef(route.routeKey);

  useEffect(() => {
    const currentQuery = route.getBaseSearchParams().toString();
    const didRouteChangeExternally =
      previousRouteKeyRef.current !== route.routeKey &&
      pendingQueryRef.current !== currentQuery;

    if (didRouteChangeExternally) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = 0;
      }

      pendingQueryRef.current = null;
      return;
    }

    const currentRouteState = route.readRouteState();

    previousRouteKeyRef.current = route.routeKey;

    const nextRouteState: ExplorerRouteState = {
      isHomeOnlyMode,
      selectedFolderId,
      selectedItem,
    };

    if (areRouteStatesEqual(currentRouteState, nextRouteState)) {
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
      isHomeOnlyMode,
      selectedFolderId,
      selectedItem,
    });

    const targetQuery = nextSearchParams.toString();

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
    previousRouteKeyRef.current = route.routeKey;
  }, [route.routeKey]);

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
