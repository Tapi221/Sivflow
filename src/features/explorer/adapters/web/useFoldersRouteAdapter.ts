import { useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { getLastSelectedFolderId, setLastSelectedFolderId } from "./explorerStorage";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { mapSearchParamsToExplorerRouteState } from "@/features/explorer/mappers/mapSearchParamsToExplorerRouteState";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";



type FoldersRouteAdapter = {
  routeKey: string;
  isDesktop: boolean;
  readRouteState: () => ExplorerRouteState;
  writeRouteState: (next: URLSearchParams) => void;
  persistLastSelectedFolderId: (folderId: string | null) => void;

  getBaseSearchParams: () => URLSearchParams;
};



const isLibraryPath = (pathname: string): boolean =>
  pathname.toLowerCase() === "/library" ||
  pathname.toLowerCase() === "/library/pdf" ||
  pathname.toLowerCase() === "/library/flashcard";
const toLibraryAwareSearchParams = (
  pathname: string,
  searchParams: URLSearchParams,
): URLSearchParams => {
  const next = new URLSearchParams(searchParams.toString());

  if (isLibraryPath(pathname)) {
    next.set("view", "section-list");
    if (pathname.toLowerCase() === "/library/pdf") {
      next.set("libraryType", "pdf");
    }
    if (pathname.toLowerCase() === "/library/flashcard") {
      next.set("libraryType", "flashcards");
    }
  }

  return next;
};
const useFoldersRouteAdapter = (): FoldersRouteAdapter => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();

  const presentationTarget = usePresentationTarget();
  const isDesktop = presentationTarget === "desktop";

  const effectiveSearchParams = useMemo(
    () => toLibraryAwareSearchParams(pathname, searchParams),
    [pathname, searchParams],
  );

  const readRouteState = useCallback(
    () =>
      mapSearchParamsToExplorerRouteState({
        searchParams: effectiveSearchParams,
        fallbackFolderId: getLastSelectedFolderId(),
      }),
    [effectiveSearchParams],
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
    () => new URLSearchParams(effectiveSearchParams.toString()),
    [effectiveSearchParams],
  );

  return useMemo(
    () => ({
      routeKey: `${pathname}?${effectiveSearchParams.toString()}`,
      isDesktop,
      readRouteState,
      writeRouteState,
      persistLastSelectedFolderId: persistLastFolder,

      getBaseSearchParams,
    }),
    [
      effectiveSearchParams,
      getBaseSearchParams,
      isDesktop,
      pathname,
      persistLastFolder,
      readRouteState,
      writeRouteState,
    ],
  );
};



export { useFoldersRouteAdapter };


export type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
export type { FoldersRouteAdapter };
