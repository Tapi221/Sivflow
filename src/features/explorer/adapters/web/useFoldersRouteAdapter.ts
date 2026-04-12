import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
export type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { mapSearchParamsToExplorerRouteState } from "@/features/explorer/mappers/mapSearchParamsToExplorerRouteState";
import {
  getLastSelectedFolderId,
  setLastSelectedFolderId,
} from "./explorerStorage";
import { useExplorerSettingsOpener } from "./useExplorerSettingsOpener";

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
  const isDesktop = useIsDesktopRuntime();

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
