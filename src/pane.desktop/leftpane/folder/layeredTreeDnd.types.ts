import type { Dispatch, RefObject, SetStateAction } from "react";

export type LayeredTreeDropPosition = "before" | "inside" | "after" | "append";

export type LayeredTreeDropInstruction = { sourceId: string; targetId: string | null; position: LayeredTreeDropPosition; parentId: string | null; };

export type LayeredTreeDragState = { draggingId: string | null; dropInstruction: LayeredTreeDropInstruction | null; };

export type LayeredTreeItem = { id: string; };

export type LayeredTreeItemPatch = { parentId: string | null; orderIndex: number; };

export type UseLayeredTreeDragDropParams<TItem extends LayeredTreeItem> = { rootItems: TItem[]; rootDropParentId: string | null; scrollContainerRef: RefObject<HTMLDivElement | null>; getChildItems: (itemId: string) => TItem[]; getParentId: (item: TItem) => string | null; getOrderIndex: (item: TItem) => number; updateItem: (itemId: string, patch: LayeredTreeItemPatch) => void | Promise<void>; setExpandedIds: Dispatch<SetStateAction<Set<string>>>; };
