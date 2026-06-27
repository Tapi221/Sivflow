import { useEffect, useLayoutEffect, useRef } from "react";
import type { FoldersRouteAdapter } from "@/features/explorer/adapters/web/useFoldersRouteAdapter";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { mapExplorerSelectionToSearchParams } from "@/features/explorer/mappers/mapExplorerSelectionToSearchParams";
import { isSameSelectedExplorerItem } from "@/features/explorer/utils/isSameSelectedExplorerItem";
import type { SelectedExplorerItem } from "@/types";



type Params = {
  route: FoldersRouteAdapter;
  isHomeOnlyMode: boolean;
  isSectionListMode: boolean;
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  applyRouteState: (next: ExplorerRouteState) => void;
};



const areRouteStatesEqual = (
  a: ExplorerRouteState,
  b: ExplorerRouteState,
): boolean =>
  a.isHomeOnlyMode === b.isHomeOnlyMode &&
  a.isSectionListMode === b.isSectionListMode &&
  a.selectedFolderId === b.selectedFolderId &&
  isSameSelectedExplorerItem(a.selectedItem, b.selectedItem);
const useExplorerRouteSync = ({ route, isHomeOnlyMode, isSectionListMode, selectedFolderId, selectedItem, applyRouteState }: Params) => {
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
      isSectionListMode,
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
      isSectionListMode,
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
  }, [
    isHomeOnlyMode,
    isSectionListMode,
    route,
    selectedFolderId,
    selectedItem,
  ]);

  useEffect(() => {
    previousRouteKeyRef.current = route.routeKey;
  }, [route.routeKey]);

  useLayoutEffect(() => {
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
      isSectionListMode,
      selectedFolderId,
      selectedItem,
    };

    if (areRouteStatesEqual(externalRouteState, localRouteState)) {
      return;
    }

    applyRouteState(externalRouteState);
  }, [
    applyRouteState,
    isHomeOnlyMode,
    isSectionListMode,
    route,
    route.routeKey,
    selectedFolderId,
    selectedItem,
  ]);
};



export { useExplorerRouteSync };
