import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { createCardSelectedItem, createCardSetSelectedItem, createDocumentSelectedItem } from "@/features/explorer/utils/createSelectedExplorerItem";



type Params = {
  searchParams: URLSearchParams;
  fallbackFolderId: string | null;
};



const mapSearchParamsToExplorerRouteState = ({ searchParams, fallbackFolderId }: Params): ExplorerRouteState => {
  const isHomeOnlyMode = searchParams.get("home") === "1";
  const isSectionListMode = searchParams.get("view") === "section-list";

  const queryFolderId = searchParams.get("folderId");
  const queryCardId = searchParams.get("cardId");
  const queryCardSetId = searchParams.get("cardSetId");
  const queryDocId = searchParams.get("docId");

  const hasExplicitSelection = [
    queryFolderId,
    queryCardId,
    queryCardSetId,
    queryDocId,
  ].some((value) => Boolean(value));

  return {
    isHomeOnlyMode,
    isSectionListMode,
    selectedFolderId:
      isHomeOnlyMode || isSectionListMode
        ? null
        : (queryFolderId ??
          (hasExplicitSelection ? null : (fallbackFolderId ?? null))),
    selectedItem:
      isHomeOnlyMode || isSectionListMode
        ? null
        : queryCardId
          ? createCardSelectedItem(queryCardId)
          : queryCardSetId
            ? createCardSetSelectedItem(queryCardSetId)
            : queryDocId
              ? createDocumentSelectedItem(queryDocId)
              : null,
  };
};



export { mapSearchParamsToExplorerRouteState };
