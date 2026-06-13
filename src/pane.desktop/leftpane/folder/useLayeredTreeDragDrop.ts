import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { LAYERED_TREE_AUTO_EXPAND_DELAY_MS, LAYERED_TREE_DND_MIME_TYPE } from "./layeredTreeDnd.constants";
import type { LayeredTreeDropInstruction, LayeredTreeItem, UseLayeredTreeDragDropParams } from "./layeredTreeDnd.types";
import { applyLayeredTreeDragPreview, createLayeredTreeItemMap, createLayeredTreeReorderedSiblingList, getLayeredTreeAutoScrollStep, getLayeredTreeDropParentId, getLayeredTreeDropPosition, getLayeredTreeDropPositionFromTarget, isLayeredTreeDropInstructionEqual, isLayeredTreeItemAncestorOf, resolveLayeredTreeEventDropTarget } from "./layeredTreeDnd.utils";



const useLayeredTreeDragDrop = <TItem extends LayeredTreeItem>({ rootItems, rootDropParentId, scrollContainerRef, getChildItems, getParentId, getOrderIndex, updateItem, setExpandedIds }: UseLayeredTreeDragDropParams<TItem>) => {
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

  const getResolvedDropInstruction = useCallback((event: ReactDragEvent<HTMLElement>): LayeredTreeDropInstruction | null => {
    const target = resolveLayeredTreeEventDropTarget(event, itemMap);
    if (!target) return null;

    const sourceId = getDraggingItemId();
    const targetId = target.id;
    if (!sourceId || sourceId === targetId) return null;

    const targetItem = itemMap.get(targetId);
    if (!itemMap.has(sourceId) || !targetItem) return null;

    const position = getLayeredTreeDropPositionFromTarget(event, target);
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
    scheduleAutoScroll(event);
    const instruction = getResolvedDropInstruction(event) ?? getValidAppendDropInstruction();
    if (!instruction) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    scheduleAutoExpand(instruction);
    setDropInstruction((current) => isLayeredTreeDropInstructionEqual(current, instruction) ? current : instruction);
  }, [getResolvedDropInstruction, getValidAppendDropInstruction, scheduleAutoExpand, scheduleAutoScroll]);

  const handleListDragLeave = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
    clearDropTarget();
    stopAutoScroll();
  }, [clearDropTarget, stopAutoScroll]);

  const handleListDrop = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const instruction = getResolvedDropInstruction(event) ?? getValidAppendDropInstruction();
    if (!instruction) return;

    event.preventDefault();
    event.stopPropagation();
    setDropInstruction(null);
    void commitDrop(instruction).finally(clearDragState);
  }, [clearDragState, commitDrop, getResolvedDropInstruction, getValidAppendDropInstruction]);

  useEffect(() => {
    if (!draggingId && !dropInstruction) return;

    const handleGlobalDragEnd = () => {
      clearDragState();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") clearDragState();
    };

    window.addEventListener("dragend", handleGlobalDragEnd);
    window.addEventListener("drop", handleGlobalDragEnd);
    window.addEventListener("blur", handleGlobalDragEnd);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd);
      window.removeEventListener("drop", handleGlobalDragEnd);
      window.removeEventListener("blur", handleGlobalDragEnd);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearDragState, draggingId, dropInstruction]);

  useEffect(() => () => {
    clearAutoExpandTimer();
    stopAutoScroll();
  }, [clearAutoExpandTimer, stopAutoScroll]);

  return { dragState: { draggingId, dropInstruction }, handleItemDragStart, handleItemDragOver, handleItemDragLeave, handleItemDrop, handleItemDragEnd: clearDragState, handleListDragOver, handleListDragLeave, handleListDrop };
};



export { useLayeredTreeDragDrop };
