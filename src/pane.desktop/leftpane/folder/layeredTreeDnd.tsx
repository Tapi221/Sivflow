import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent as ReactDragEvent, type RefObject, type SetStateAction } from "react";
import { cn } from "@/lib/utils";

export type LayeredTreeDropPosition = "before" | "inside" | "after" | "append";

export type LayeredTreeDropInstruction = { sourceId: string; targetId: string | null; position: LayeredTreeDropPosition; parentId: string | null; };

export type LayeredTreeDragState = { draggingId: string | null; dropInstruction: LayeredTreeDropInstruction | null; };

type LayeredTreeItem = { id: string; };

type LayeredTreeItemPatch = { parentId: string | null; orderIndex: number; };

type UseLayeredTreeDragDropParams<TItem extends LayeredTreeItem> = { rootItems: TItem[]; rootDropParentId: string | null; scrollContainerRef: RefObject<HTMLDivElement | null>; getChildItems: (itemId: string) => TItem[]; getParentId: (item: TItem) => string | null; getOrderIndex: (item: TItem) => number; updateItem: (itemId: string, patch: LayeredTreeItemPatch) => void | Promise<void>; setExpandedIds: Dispatch<SetStateAction<Set<string>>>; };

export const LAYERED_TREE_ROOT_LEVEL = 1;
export const LAYERED_TREE_INDENT_PX = 14;
export const LAYERED_TREE_DROP_INDICATOR_BASE_LEFT_PX = 18;
export const LAYERED_TREE_ROOT_DROP_INDICATOR_LEFT_PX = 8;

const LAYERED_TREE_DND_MIME_TYPE = "application/x-manifolia-layered-tree-id";
const LAYERED_TREE_ROW_SELECTOR = "[data-layered-tree-row='true']";
const LAYERED_TREE_DROP_EDGE_RATIO = 0.24;
const LAYERED_TREE_DROP_INSIDE_INTENT_OFFSET_PX = 76;
const LAYERED_TREE_AUTO_EXPAND_DELAY_MS = 520;
const LAYERED_TREE_DRAG_IMAGE_OFFSET_X = 18;
const LAYERED_TREE_DRAG_IMAGE_OFFSET_Y = 16;
const LAYERED_TREE_AUTO_SCROLL_EDGE_PX = 42;
const LAYERED_TREE_AUTO_SCROLL_MAX_STEP = 18;

export const getLayeredTreeDropIndicatorLeft = (level: number): number => Math.max(0, level - LAYERED_TREE_ROOT_LEVEL) * LAYERED_TREE_INDENT_PX + LAYERED_TREE_DROP_INDICATOR_BASE_LEFT_PX;

export const isLayeredTreeAppendDropTarget = (dragState: LayeredTreeDragState, parentId: string | null): boolean => dragState.dropInstruction?.position === "append" && dragState.dropInstruction.parentId === parentId;

const getLayeredTreeDropInlineOffset = (element: HTMLElement): number => {
  const paddingLeft = Number.parseFloat(element.style.paddingLeft);
  return Number.isFinite(paddingLeft) ? paddingLeft : 0;
};

const getLayeredTreeDropPosition = (event: ReactDragEvent<HTMLElement>): LayeredTreeDropPosition => {
  const rect = event.currentTarget.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;
  const offsetX = event.clientX - rect.left;
  const insideIntentX = getLayeredTreeDropInlineOffset(event.currentTarget) + LAYERED_TREE_DROP_INSIDE_INTENT_OFFSET_PX;
  const isInsideIntent = offsetX >= insideIntentX && offsetY > rect.height * LAYERED_TREE_DROP_EDGE_RATIO && offsetY < rect.height * (1 - LAYERED_TREE_DROP_EDGE_RATIO);

  if (isInsideIntent) return "inside";
  return offsetY < rect.height / 2 ? "before" : "after";
};

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

const isLayeredTreeDropInstructionEqual = (left: LayeredTreeDropInstruction | null, right: LayeredTreeDropInstruction | null): boolean => left?.sourceId === right?.sourceId && left?.targetId === right?.targetId && left?.position === right?.position && left?.parentId === right?.parentId;

export const LayeredTreeDropIndicator = ({ position, left, className }: { position: Exclude<LayeredTreeDropPosition, "inside">; left: number; className?: string; }) => (
  <span aria-hidden="true" className={cn("pointer-events-none absolute left-0 right-2 z-10 flex h-0.5 items-center", position === "before" && "top-0", position === "after" && "bottom-0", position === "append" && "relative right-auto my-1", className)} style={{ paddingLeft: left }}>
    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8f8f8f]" />
    <span className="h-0.5 min-w-0 flex-1 rounded-full bg-[#8f8f8f]" />
  </span>
);

export const useLayeredTreeDragDrop = <TItem extends LayeredTreeItem>({ rootItems, rootDropParentId, scrollContainerRef, getChildItems, getParentId, getOrderIndex, updateItem, setExpandedIds }: UseLayeredTreeDragDropParams<TItem>) => {
  const itemMap = useMemo(() => createLayeredTreeItemMap(rootItems, getChildItems), [getChildItems, rootItems]);
  const autoExpandTimerRef = useRef<number | null>(null);
  const autoExpandTargetRef = useRef<string | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollStepRef = useRef(0);
  const draggingItemIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropInstruction, setDropInstruction] = useState<LayeredTreeDropInstruction | null>(null);

  const stopAutoScroll = useCallback(() => {
    autoScrollStepRef.current = 0;
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const scheduleAutoScroll = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const step = getLayeredTreeAutoScrollStep(event.clientY, scrollContainer);
    autoScrollStepRef.current = step;

    if (step === 0) {
      stopAutoScroll();
      return;
    }

    if (autoScrollFrameRef.current !== null) return;

    const tick = () => {
      const currentScrollContainer = scrollContainerRef.current;
      const currentStep = autoScrollStepRef.current;
      if (!currentScrollContainer || currentStep === 0) {
        autoScrollFrameRef.current = null;
        return;
      }
      currentScrollContainer.scrollTop += currentStep;
      autoScrollFrameRef.current = window.requestAnimationFrame(tick);
    };

    autoScrollFrameRef.current = window.requestAnimationFrame(tick);
  }, [scrollContainerRef, stopAutoScroll]);

  const clearAutoExpandTimer = useCallback(() => {
    if (autoExpandTimerRef.current !== null) {
      window.clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
    autoExpandTargetRef.current = null;
  }, []);

  const clearDragState = useCallback(() => {
    draggingItemIdRef.current = null;
    clearAutoExpandTimer();
    stopAutoScroll();
    setDraggingId(null);
    setDropInstruction(null);
  }, [clearAutoExpandTimer, stopAutoScroll]);

  const clearDropTarget = useCallback(() => {
    clearAutoExpandTimer();
    setDropInstruction(null);
  }, [clearAutoExpandTimer]);

  const getDraggingItemId = useCallback(() => draggingItemIdRef.current ?? draggingId, [draggingId]);

  const scheduleAutoExpand = useCallback((instruction: LayeredTreeDropInstruction) => {
    if (instruction.position !== "inside" || !instruction.targetId) {
      clearAutoExpandTimer();
      return;
    }
    if (autoExpandTargetRef.current === instruction.targetId) return;

    clearAutoExpandTimer();
    autoExpandTargetRef.current = instruction.targetId;
    autoExpandTimerRef.current = window.setTimeout(() => {
      setExpandedIds((current) => current.has(instruction.targetId!) ? current : new Set(current).add(instruction.targetId!));
      autoExpandTimerRef.current = null;
    }, LAYERED_TREE_AUTO_EXPAND_DELAY_MS);
  }, [clearAutoExpandTimer, setExpandedIds]);

  const getValidDropInstruction = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string): LayeredTreeDropInstruction | null => {
    const sourceId = getDraggingItemId();
    if (!sourceId || sourceId === targetId) return null;

    const sourceItem = itemMap.get(sourceId);
    const targetItem = itemMap.get(targetId);
    if (!sourceItem || !targetItem) return null;

    const position = getLayeredTreeDropPosition(event);
    const parentId = getLayeredTreeDropParentId(targetItem, targetId, position, getParentId);
    if (isLayeredTreeItemAncestorOf(sourceId, parentId, getChildItems)) return null;

    return { sourceId, targetId, position, parentId };
  }, [getChildItems, getDraggingItemId, getParentId, itemMap]);

  const getValidAppendDropInstruction = useCallback((): LayeredTreeDropInstruction | null => {
    const sourceId = getDraggingItemId();
    if (!sourceId) return null;
    if (!itemMap.has(sourceId)) return null;
    if (isLayeredTreeItemAncestorOf(sourceId, rootDropParentId, getChildItems)) return null;
    return { sourceId, targetId: null, position: "append", parentId: rootDropParentId };
  }, [getChildItems, getDraggingItemId, itemMap, rootDropParentId]);

  const commitDrop = useCallback(async (instruction: LayeredTreeDropInstruction) => {
    const sourceItem = itemMap.get(instruction.sourceId);
    const targetItem = instruction.targetId ? itemMap.get(instruction.targetId) ?? null : null;
    if (!sourceItem) return;
    if (instruction.targetId && !targetItem) return;

    const targetParentId = instruction.parentId;
    if (isLayeredTreeItemAncestorOf(instruction.sourceId, targetParentId, getChildItems)) return;

    const nextSiblings = createLayeredTreeReorderedSiblingList(sourceItem, targetItem, targetParentId, instruction.position, rootItems, getChildItems);

    for (const [orderIndex, item] of nextSiblings.entries()) {
      const currentParentId = getParentId(item);
      const currentOrderIndex = getOrderIndex(item);
      if (currentParentId === targetParentId && currentOrderIndex === orderIndex) continue;

      await updateItem(item.id, { parentId: targetParentId, orderIndex });
    }

    if (instruction.position === "inside" && instruction.targetId) {
      setExpandedIds((current) => new Set(current).add(instruction.targetId!));
    }
  }, [getChildItems, getOrderIndex, getParentId, itemMap, rootItems, setExpandedIds, updateItem]);

  const handleItemDragStart = useCallback((event: ReactDragEvent<HTMLElement>, itemId: string) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(LAYERED_TREE_DND_MIME_TYPE, itemId);
    event.dataTransfer.setData("text/plain", itemId);
    applyLayeredTreeDragPreview(event);
    draggingItemIdRef.current = itemId;
    setDraggingId(itemId);
  }, []);

  const handleItemDragOver = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string) => {
    scheduleAutoScroll(event);
    const instruction = getValidDropInstruction(event, targetId);
    event.stopPropagation();

    if (!instruction) {
      clearDropTarget();
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    scheduleAutoExpand(instruction);
    setDropInstruction((current) => isLayeredTreeDropInstructionEqual(current, instruction) ? current : instruction);
  }, [clearDropTarget, getValidDropInstruction, scheduleAutoExpand, scheduleAutoScroll]);

  const handleItemDragLeave = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;

    setDropInstruction((current) => {
      if (current?.targetId !== targetId) return current;
      clearAutoExpandTimer();
      return null;
    });
  }, [clearAutoExpandTimer]);

  const handleItemDrop = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string) => {
    const instruction = getValidDropInstruction(event, targetId);
    event.stopPropagation();

    if (!instruction) {
      clearDropTarget();
      stopAutoScroll();
      return;
    }

    event.preventDefault();
    setDropInstruction(null);
    void commitDrop(instruction).finally(clearDragState);
  }, [clearDragState, clearDropTarget, commitDrop, getValidDropInstruction, stopAutoScroll]);

  const handleListDragOver = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (isLayeredTreeRowEventTarget(event.target)) return;
    scheduleAutoScroll(event);
    const instruction = getValidAppendDropInstruction();
    if (!instruction) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    clearAutoExpandTimer();
    setDropInstruction((current) => isLayeredTreeDropInstructionEqual(current, instruction) ? current : instruction);
  }, [clearAutoExpandTimer, getValidAppendDropInstruction, scheduleAutoScroll]);

  const handleListDragLeave = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
    clearDropTarget();
    stopAutoScroll();
  }, [clearDropTarget, stopAutoScroll]);

  const handleListDrop = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (isLayeredTreeRowEventTarget(event.target)) return;
    const instruction = getValidAppendDropInstruction();
    if (!instruction) return;

    event.preventDefault();
    event.stopPropagation();
    setDropInstruction(null);
    void commitDrop(instruction).finally(clearDragState);
  }, [clearDragState, commitDrop, getValidAppendDropInstruction]);

  useEffect(() => () => {
    clearAutoExpandTimer();
    stopAutoScroll();
  }, [clearAutoExpandTimer, stopAutoScroll]);

  return { dragState: { draggingId, dropInstruction }, handleItemDragStart, handleItemDragOver, handleItemDragLeave, handleItemDrop, handleItemDragEnd: clearDragState, handleListDragOver, handleListDragLeave, handleListDrop };
};
