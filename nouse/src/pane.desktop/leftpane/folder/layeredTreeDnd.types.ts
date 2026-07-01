import type { Dispatch, RefObject, SetStateAction } from "react";



type LayeredTreeDropPosition = "before" | "inside" | "after" | "append";
type LayeredTreeDropInstruction = {
  sourceId: string; targetId: string | null; position: LayeredTreeDropPosition; parentId: string | null; };
type LayeredTreeDragState = {
  draggingId: string | null; dropInstruction: LayeredTreeDropInstruction | null; };
type LayeredTreeItem = {
  id: string; };
type LayeredTreeItemPatch = {
  parentId: string | null; orderIndex: number; };
type UseLayeredTreeDragDropParams<TItem extends LayeredTreeItem> = {
  rootItems: TItem[]; rootDropParentId: string | null; scrollContainerRef: RefObject<HTMLDivElement | null>; getChildItems: (itemId: string) => TItem[]; getParentId: (item: TItem) => string | null; getOrderIndex: (item: TItem) => number; updateItem: (itemId: string, patch: LayeredTreeItemPatch) => void | Promise<void>; setExpandedIds: Dispatch<SetStateAction<Set<string>>>; };

export type { LayeredTreeDropPosition, LayeredTreeDropInstruction, LayeredTreeDragState, LayeredTreeItem, LayeredTreeItemPatch, UseLayeredTreeDragDropParams };
