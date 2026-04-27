import type { ExplorerDetailRowKind } from "@/components/folder/explorer/model/detailRows";

export type ExplorerDetailSortKey =
  | "manual"
  | "name"
  | "updatedAt"
  | "kind"
  | "size";

export type ExplorerDetailColumnId =
  | "name"
  | "tags"
  | "path"
  | "updatedAt"
  | "sync"
  | "kind"
  | "size";

export type ExplorerDetailSortDirection = "asc" | "desc";
export type ExplorerDetailDropPosition = "before" | "after" | "inside" | "append";

export type ExplorerDetailSortState = {
  key: ExplorerDetailSortKey;
  direction: ExplorerDetailSortDirection;
};

export type ExplorerDetailDragPayload = {
  kind: ExplorerDetailRowKind;
  id: string;
};

export type ExplorerDetailDropIntent = {
  rowKey: string;
  position: ExplorerDetailDropPosition;
};

export type ExplorerDetailTagEditorState = {
  rowKey: string;
  rowKind: ExplorerDetailRowKind;
  rowId: string;
  value: string;
  error: string | null;
  isSaving: boolean;
};
