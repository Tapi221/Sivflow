import type {
  ExplorerDetailRow,
  ExplorerDetailRowKind,
} from "@/components/folder/explorer/model/detailRows";
import { DEFAULT_SORT_STATE } from "./folderDetailColumns";
import type {
  ExplorerDetailSortDirection,
  ExplorerDetailSortKey,
  ExplorerDetailSortState,
} from "./folderDetailTypes";

const sortByString = (
  left: string,
  right: string,
  direction: ExplorerDetailSortDirection,
): number => {
  const result = left.localeCompare(right, "ja");
  return direction === "asc" ? result : -result;
};

const sortByNumber = (
  left: number,
  right: number,
  direction: ExplorerDetailSortDirection,
): number => {
  const result = left - right;
  return direction === "asc" ? result : -result;
};

const getKindSortValue = (kind: ExplorerDetailRowKind): number => {
  if (kind === "folder") return 0;
  if (kind === "cardSet") return 1;
  if (kind === "card") return 2;
  return 3;
};

export const sortRows = (
  rows: ExplorerDetailRow[],
  sortState: ExplorerDetailSortState,
): ExplorerDetailRow[] => {
  if (sortState.key === "manual") return rows;

  return [...rows].sort((left, right) => {
    if (sortState.key === "name") {
      return sortByString(left.name, right.name, sortState.direction);
    }

    if (sortState.key === "updatedAt") {
      return sortByNumber(
        left.updatedAtMs,
        right.updatedAtMs,
        sortState.direction,
      );
    }

    if (sortState.key === "kind") {
      return sortByNumber(
        getKindSortValue(left.kind),
        getKindSortValue(right.kind),
        sortState.direction,
      );
    }

    const leftSize = left.sizeBytes ?? -1;
    const rightSize = right.sizeBytes ?? -1;
    return sortByNumber(leftSize, rightSize, sortState.direction);
  });
};

export const getNextSortState = (
  current: ExplorerDetailSortState,
  key: Exclude<ExplorerDetailSortKey, "manual">,
): ExplorerDetailSortState => {
  if (current.key !== key) {
    return {
      key,
      direction: key === "updatedAt" ? "desc" : "asc",
    };
  }

  if (current.direction === "asc") {
    return { key, direction: "desc" };
  }

  return DEFAULT_SORT_STATE;
};

export const getHeaderSortLabel = (
  sortState: ExplorerDetailSortState,
  key: Exclude<ExplorerDetailSortKey, "manual">,
): string => {
  if (sortState.key !== key) return "";
  return sortState.direction === "asc" ? " ▲" : " ▼";
};

export const getHeaderAriaSort = (
  sortState: ExplorerDetailSortState,
  key: Exclude<ExplorerDetailSortKey, "manual">,
): "ascending" | "descending" | "none" => {
  if (sortState.key !== key) return "none";
  return sortState.direction === "asc" ? "ascending" : "descending";
};
