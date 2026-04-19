import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import {
  createCardSelectedItem,
  createCardSetSelectedItem,
  createDocumentSelectedItem,
} from "@/features/explorer/utils/createSelectedExplorerItem";

type Params = {
  searchParams: URLSearchParams;
  fallbackFolderId: string | null;
};

const normalizeQueryValue = (value: string | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const mapSearchParamsToExplorerRouteState = ({
  searchParams,
  fallbackFolderId,
}: Params): ExplorerRouteState => {
  const isHomeOnlyMode = searchParams.get("home") === "1";
  const isSectionListMode = searchParams.get("view") === "section-list";
  const queryFolderId = normalizeQueryValue(searchParams.get("folderId"));
  const queryCardId = normalizeQueryValue(searchParams.get("cardId"));
  const queryCardSetId = normalizeQueryValue(searchParams.get("cardSetId"));
  const queryDocId = normalizeQueryValue(searchParams.get("docId"));

  return {
    isHomeOnlyMode,
    selectedFolderId: isHomeOnlyMode
      ? null
      : isSectionListMode
        ? null
        : (queryFolderId ?? fallbackFolderId ?? null),
    selectedItem: isHomeOnlyMode
      ? null
      : queryCardId
        ? createCardSelectedItem(queryCardId)
        : queryDocId
          ? createDocumentSelectedItem(queryDocId)
          : queryCardSetId
            ? createCardSetSelectedItem(queryCardSetId)
            : null,
  };
};
