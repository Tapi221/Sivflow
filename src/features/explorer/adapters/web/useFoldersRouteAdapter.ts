import { useSearchParams } from "react-router-dom";
import { mapSearchParamsToExplorerRouteState } from "../../mappers/mapSearchParamsToExplorerRouteState";
import { mapExplorerSelectionToSearchParams } from "../../mappers/mapExplorerSelectionToSearchParams";

export const useFoldersRouteAdapter = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  return {
    readRouteState: () => mapSearchParamsToExplorerRouteState(searchParams),
    writeRouteState: (params: {
      selectedFolderId: string | null;
      selectedItem: unknown;
    }) => {
      const next = mapExplorerSelectionToSearchParams({
        base: searchParams,
        selectedFolderId: params.selectedFolderId,
        selectedItem: params.selectedItem,
      });
      setSearchParams(next, { replace: true });
    },
  };
};
