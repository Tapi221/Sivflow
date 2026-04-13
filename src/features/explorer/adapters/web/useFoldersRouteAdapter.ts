import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { mapSearchParamsToExplorerRouteState } from "@/features/explorer/mappers/mapSearchParamsToExplorerRouteState";
import {
  getLastSelectedFolderId,
  setLastSelectedFolderId,
} from "./explorerStorage";
import { useExplorerSettingsOpener } from "./useExplorerSettingsOpener";

export type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";

export type FoldersRouteAdapter = {
  routeKey: string;
  isDesktop: boolean;
  readRouteState: () => ExplorerRouteState;
  writeRouteState: (next: URLSearchParams) => void;
  persistLastSelectedFolderId: (folderId: string | null) => void;
  openSettings: () => void;
  getBaseSearchParams: () => URLSearchParams;
};

export const useFoldersRouteAdapter = (): FoldersRouteAdapter => {
  const [searchParams, setSearchParams] = useSearchParams();
  const openSettings = useExplorerSettingsOpener();
  const presentationTarget = usePresentationTarget();
  const isDesktop = presentationTarget === "desktop";

  const readRouteState = useCallback(
    () =>
      mapSearchParamsToExplorerRouteState({
        searchParams,
        fallbackFolderId: getLastSelectedFolderId(),
      }),
    [searchParams],
  );

  const writeRouteState = useCallback(
    (next: URLSearchParams) => {
      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

  const persistLastFolder = useCallback((folderId: string | null) => {
    setLastSelectedFolderId(folderId);
  }, []);

  const getBaseSearchParams = useCallback(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  return useMemo(
    () => ({
      routeKey: searchParams.toString(),
      isDesktop,
      readRouteState,
      writeRouteState,
      persistLastSelectedFolderId: persistLastFolder,
      openSettings,
      getBaseSearchParams,
    }),
    [
      getBaseSearchParams,
      isDesktop,
      openSettings,
      persistLastFolder,
      readRouteState,
      searchParams,
      writeRouteState,
    ],
  );
};