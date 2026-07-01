import type { DragEvent as ReactDragEvent } from "react";
import { LAYERED_TREE_AUTO_SCROLL_EDGE_PX, LAYERED_TREE_AUTO_SCROLL_MAX_STEP, LAYERED_TREE_DRAG_IMAGE_OFFSET_X, LAYERED_TREE_DRAG_IMAGE_OFFSET_Y, LAYERED_TREE_DROP_EDGE_RATIO, LAYERED_TREE_DROP_HIT_TEST_VERTICAL_TOLERANCE_PX, LAYERED_TREE_DROP_INDICATOR_BASE_LEFT_PX, LAYERED_TREE_DROP_INSIDE_INTENT_OFFSET_PX, LAYERED_TREE_FOLDER_ID_ATTRIBUTE, LAYERED_TREE_INDENT_PX, LAYERED_TREE_ROOT_LEVEL, LAYERED_TREE_ROW_SELECTOR, LAYERED_TREE_TAG_ID_ATTRIBUTE } from "./layeredTreeDnd.constants";
import type { LayeredTreeDragState, LayeredTreeDropInstruction, LayeredTreeDropPosition, LayeredTreeItem } from "./layeredTreeDnd.types";



type LayeredTreeEventDropTarget = {
  id: string; rowElement: HTMLElement; };



const LAYERED_TREE_ITEM_ID_ATTRIBUTES = [LAYERED_TREE_FOLDER_ID_ATTRIBUTE, LAYERED_TREE_TAG_ID_ATTRIBUTE] as const;



const getLayeredTreeItemId = (rowElement: HTMLElement): string | null => {
  for (const attributeName of LAYERED_TREE_ITEM_ID_ATTRIBUTES) {
    const itemId = rowElement.closest(`[${attributeName}]`)?.getAttribute(attributeName)?.trim();
    if (itemId) return itemId;
  }

  return null;
};
const getLayeredTreeDropInlineOffset = (element: HTMLElement): number => {
  const paddingLeft = Number.parseFloat(element.style.paddingLeft);
  return Number.isFinite(paddingLeft) ? paddingLeft : 0;
};
const getLayeredTreeDropPositionForRow = (event: ReactDragEvent<HTMLElement>, rowElement: HTMLElement): LayeredTreeDropPosition => {
  const rect = rowElement.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;
  const offsetX = event.clientX - rect.left;
  const insideIntentX = getLayeredTreeDropInlineOffset(rowElement) + LAYERED_TREE_DROP_INSIDE_INTENT_OFFSET_PX;
  const isInsideIntent = offsetX >= insideIntentX && offsetY > rect.height * LAYERED_TREE_DROP_EDGE_RATIO && offsetY < rect.height * (1 - LAYERED_TREE_DROP_EDGE_RATIO);

  if (isInsideIntent) return "inside";
  return offsetY < rect.height / 2 ? "before" : "after";
};
const getLayeredTreeDropIndicatorLeft = (level: number): number => Math.max(0, level - LAYERED_TREE_ROOT_LEVEL) * LAYERED_TREE_INDENT_PX + LAYERED_TREE_DROP_INDICATOR_BASE_LEFT_PX;
const isLayeredTreeAppendDropTarget = (dragState: LayeredTreeDragState, parentId: string | null): boolean => dragState.dropInstruction?.position === "append" && dragState.dropInstruction.parentId === parentId;
const getLayeredTreeDropPosition = (event: ReactDragEvent<HTMLElement>): LayeredTreeDropPosition => getLayeredTreeDropPositionForRow(event, event.currentTarget);
const getLayeredTreeDropParentId = <TItem extends LayeredTreeItem>(targetItem: TItem, targetId: string, position: LayeredTreeDropPosition, getParentId: (item: TItem) => string | null): string | null => position === "inside" ? targetId : getParentId(targetItem);
const createLayeredTreeItemMap = <TItem extends LayeredTreeItem>(rootItems: TItem[], getChildItems: (itemId: string) => TItem[]): Map<string, TItem> => {
  const map = new Map<string, TItem>();
  const stack = [...rootItems];

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item || map.has(item.id)) continue;

    map.set(item.id, item);
    stack.push(...getChildItems(item.id));
  }

  return map;
};
const isLayeredTreeItemAncestorOf = <TItem extends LayeredTreeItem>(sourceId: string, candidateParentId: string | null, getChildItems: (itemId: string) => TItem[]): boolean => {
  if (!candidateParentId) return false;
  if (sourceId === candidateParentId) return true;

  const stack = getChildItems(sourceId).map((item) => item.id);
  const visited = new Set<string>();

  while (stack.length > 0) {
    const itemId = stack.pop();
    if (!itemId || visited.has(itemId)) continue;
    if (itemId === candidateParentId) return true;

    visited.add(itemId);
    stack.push(...getChildItems(itemId).map((item) => item.id));
  }

  return false;
};
const getLayeredTreeSiblings = <TItem extends LayeredTreeItem>(parentId: string | null, rootItems: TItem[], getChildItems: (itemId: string) => TItem[]): TItem[] => parentId ? getChildItems(parentId) : rootItems;
const createLayeredTreeReorderedSiblingList = <TItem extends LayeredTreeItem>(sourceItem: TItem, targetItem: TItem | null, targetParentId: string | null, position: LayeredTreeDropPosition, rootItems: TItem[], getChildItems: (itemId: string) => TItem[]): TItem[] => {
  const targetId = targetItem?.id ?? null;
  const siblings = getLayeredTreeSiblings(targetParentId, rootItems, getChildItems).filter((item) => item.id !== sourceItem.id);
  const insertionIndex = !targetId || position === "append" || position === "inside" ? siblings.length : Math.max(0, siblings.findIndex((item) => item.id === targetId) + (position === "after" ? 1 : 0));
  const nextSiblings = [...siblings];
  nextSiblings.splice(insertionIndex, 0, sourceItem);
  return nextSiblings;
};
const createLayeredTreeDragPreview = (sourceElement: HTMLElement): HTMLElement => {
  const rect = sourceElement.getBoundingClientRect();
  const preview = sourceElement.cloneNode(true) as HTMLElement;
  preview.removeAttribute("id");
  preview.setAttribute("aria-hidden", "true");
  preview.style.position = "fixed";
  preview.style.top = "-1000px";
  preview.style.left = "-1000px";
  preview.style.width = `${rect.width}px`;
  preview.style.height = `${rect.height}px`;
  preview.style.boxSizing = "border-box";
  preview.style.pointerEvents = "none";
  preview.style.opacity = "0.92";
  preview.style.background = "rgba(255,255,255,0.96)";
  preview.style.boxShadow = "0 10px 28px rgba(0,0,0,0.16)";
  preview.style.border = "1px solid rgba(0,0,0,0.08)";
  preview.style.borderRadius = "8px";
  preview.style.zIndex = "2147483647";
  preview.style.transform = "scale(1.01)";
  document.body.append(preview);
  return preview;
};
const applyLayeredTreeDragPreview = (event: ReactDragEvent<HTMLElement>) => {
  const preview = createLayeredTreeDragPreview(event.currentTarget);
  event.dataTransfer.setDragImage(preview, LAYERED_TREE_DRAG_IMAGE_OFFSET_X, LAYERED_TREE_DRAG_IMAGE_OFFSET_Y);
  requestAnimationFrame(() => preview.remove());
};
const getLayeredTreeAutoScrollStep = (clientY: number, scrollContainer: HTMLDivElement): number => {
  const rect = scrollContainer.getBoundingClientRect();
  const topDistance = clientY - rect.top;
  const bottomDistance = rect.bottom - clientY;

  if (topDistance < LAYERED_TREE_AUTO_SCROLL_EDGE_PX) return -Math.ceil((1 - Math.max(0, topDistance) / LAYERED_TREE_AUTO_SCROLL_EDGE_PX) * LAYERED_TREE_AUTO_SCROLL_MAX_STEP);
  if (bottomDistance < LAYERED_TREE_AUTO_SCROLL_EDGE_PX) return Math.ceil((1 - Math.max(0, bottomDistance) / LAYERED_TREE_AUTO_SCROLL_EDGE_PX) * LAYERED_TREE_AUTO_SCROLL_MAX_STEP);
  return 0;
};
const isLayeredTreeRowEventTarget = (target: EventTarget | null): boolean => target instanceof HTMLElement && target.closest(LAYERED_TREE_ROW_SELECTOR) !== null;
const resolveLayeredTreeEventDropTarget = (event: ReactDragEvent<HTMLElement>, itemMap: Map<string, LayeredTreeItem>): LayeredTreeEventDropTarget | null => {
  const targetElement = event.target instanceof HTMLElement ? event.target : null;
  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(LAYERED_TREE_ROW_SELECTOR));
  const targetRow = targetElement?.closest<HTMLElement>(LAYERED_TREE_ROW_SELECTOR) ?? null;
  const rowElement = targetRow && event.currentTarget.contains(targetRow) ? targetRow : rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return event.clientY >= rect.top - LAYERED_TREE_DROP_HIT_TEST_VERTICAL_TOLERANCE_PX && event.clientY <= rect.bottom + LAYERED_TREE_DROP_HIT_TEST_VERTICAL_TOLERANCE_PX;
  }) ?? null;
  if (!rowElement) return null;

  const id = getLayeredTreeItemId(rowElement);
  if (!id || !itemMap.has(id)) return null;

  return { id, rowElement };
};
const getLayeredTreeDropPositionFromTarget = (event: ReactDragEvent<HTMLElement>, target: LayeredTreeEventDropTarget): LayeredTreeDropPosition => getLayeredTreeDropPositionForRow(event, target.rowElement);
const isLayeredTreeDropInstructionEqual = (left: LayeredTreeDropInstruction | null, right: LayeredTreeDropInstruction | null): boolean => left?.sourceId === right?.sourceId && left?.targetId === right?.targetId && left?.position === right?.position && left?.parentId === right?.parentId;



export { getLayeredTreeDropIndicatorLeft, isLayeredTreeAppendDropTarget, getLayeredTreeDropPosition, getLayeredTreeDropParentId, createLayeredTreeItemMap, isLayeredTreeItemAncestorOf, createLayeredTreeReorderedSiblingList, applyLayeredTreeDragPreview, getLayeredTreeAutoScrollStep, isLayeredTreeRowEventTarget, resolveLayeredTreeEventDropTarget, getLayeredTreeDropPositionFromTarget, isLayeredTreeDropInstructionEqual };
