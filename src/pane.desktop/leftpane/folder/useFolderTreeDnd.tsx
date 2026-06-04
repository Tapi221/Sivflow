import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type RefObject, type SetStateAction, type Dispatch } from "react";
import { getFolderId, getParentFolderId, type FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { cn } from "@/lib/utils";
import { createFolderDragPayload, resolveFolderDragSourceId, type FolderDragPayload } from "./folderTreeDndPayload";

type FolderCommandSet = ReturnType<typeof useFolderCommands>;

type FolderDropPosition = "before" | "inside" | "after" | "append";

type FolderDropInstruction = { sourceId: string; targetId: string | null; position: FolderDropPosition; parentFolderId: string | null; };

type FolderDragState = { draggingFolderId: string | null; dragPayload: FolderDragPayload | null; dropInstruction: FolderDropInstruction | null; };

type UseFolderTreeDndParams = { rootFolders: FolderTreeNode[]; rootDropParentId: string | null; scrollContainerRef: RefObject<HTMLDivElement | null>; getChildFolders: (folderId: string) => FolderTreeNode[]; updateFolder: FolderCommandSet["updateFolder"]; setExpandedFolderIds: Dispatch<SetStateAction<Set<string>>>; };

type FolderDropIndicatorProps = { position: Exclude<FolderDropPosition, "inside">; left: number; className?: string; };

const FOLDER_DND_MIME_TYPE = "application/x-manifolia-folder-id";
const FOLDER_DROP_EDGE_RATIO = 0.24;
const FOLDER_AUTO_EXPAND_DELAY_MS = 520;
const FOLDER_DRAG_IMAGE_OFFSET_X = 18;
const FOLDER_DRAG_IMAGE_OFFSET_Y = 16;
const FOLDER_TREE_ROW_SELECTOR = "[data-folder-tree-row='true']";
const FOLDER_AUTO_SCROLL_EDGE_PX = 42;
const FOLDER_AUTO_SCROLL_MAX_STEP = 18;
const ROOT_LEVEL = 1;
const FOLDER_TREE_INDENT_PX = 14;
const FOLDER_DROP_INDICATOR_BASE_LEFT_PX = 18;
const FOLDER_DROP_INDICATOR_ROOT_LEFT_PX = 8;

const getFolderOrderIndex = (folder: FolderTreeNode): number => folder.orderIndex ?? folder.order_index ?? 0;

const isDropInstructionEqual = (left: FolderDropInstruction | null, right: FolderDropInstruction | null): boolean => left?.sourceId === right?.sourceId && left?.targetId === right?.targetId && left?.position === right?.position && left?.parentFolderId === right?.parentFolderId;

const getFolderDropPosition = (event: ReactDragEvent<HTMLElement>): FolderDropPosition => {
  const rect = event.currentTarget.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;

  if (offsetY <= rect.height * FOLDER_DROP_EDGE_RATIO) return "before";
  if (offsetY >= rect.height * (1 - FOLDER_DROP_EDGE_RATIO)) return "after";
  return "inside";
};

const getFolderDropParentId = (targetFolder: FolderTreeNode, targetId: string, position: FolderDropPosition): string | null => position === "inside" ? targetId : getParentFolderId(targetFolder);

const createFolderMap = (rootFolders: FolderTreeNode[], getChildFolders: (folderId: string) => FolderTreeNode[]): Map<string, FolderTreeNode> => {
  const map = new Map<string, FolderTreeNode>();
  const stack = [...rootFolders];

  while (stack.length > 0) {
    const folder = stack.pop();
    if (!folder) continue;

    const folderId = getFolderId(folder);
    if (!folderId || map.has(folderId)) continue;

    map.set(folderId, folder);
    stack.push(...getChildFolders(folderId));
  }

  return map;
};

const isFolderAncestorOf = (sourceId: string, candidateParentId: string | null, getChildFolders: (folderId: string) => FolderTreeNode[]): boolean => {
  if (!candidateParentId) return false;
  if (sourceId === candidateParentId) return true;

  const stack = getChildFolders(sourceId).map(getFolderId).filter(Boolean);
  const visited = new Set<string>();

  while (stack.length > 0) {
    const folderId = stack.pop();
    if (!folderId || visited.has(folderId)) continue;
    if (folderId === candidateParentId) return true;

    visited.add(folderId);
    stack.push(...getChildFolders(folderId).map(getFolderId).filter(Boolean));
  }

  return false;
};

const getFolderSiblings = (parentFolderId: string | null, rootFolders: FolderTreeNode[], getChildFolders: (folderId: string) => FolderTreeNode[]): FolderTreeNode[] => parentFolderId ? getChildFolders(parentFolderId) : rootFolders;

const createReorderedSiblingList = (sourceFolder: FolderTreeNode, targetFolder: FolderTreeNode | null, targetParentId: string | null, position: FolderDropPosition, rootFolders: FolderTreeNode[], getChildFolders: (folderId: string) => FolderTreeNode[]): FolderTreeNode[] => {
  const sourceId = getFolderId(sourceFolder);
  const targetId = targetFolder ? getFolderId(targetFolder) : null;
  const siblings = getFolderSiblings(targetParentId, rootFolders, getChildFolders).filter((folder) => getFolderId(folder) !== sourceId);
  const insertionIndex = !targetId || position === "append" || position === "inside" ? siblings.length : Math.max(0, siblings.findIndex((folder) => getFolderId(folder) === targetId) + (position === "after" ? 1 : 0));
  const nextSiblings = [...siblings];
  nextSiblings.splice(insertionIndex, 0, sourceFolder);
  return nextSiblings;
};

const createFolderDragPreview = (sourceElement: HTMLElement): HTMLElement => {
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

const applyFolderDragPreview = (event: ReactDragEvent<HTMLElement>) => {
  const preview = createFolderDragPreview(event.currentTarget);
  event.dataTransfer.setDragImage(preview, FOLDER_DRAG_IMAGE_OFFSET_X, FOLDER_DRAG_IMAGE_OFFSET_Y);
  requestAnimationFrame(() => preview.remove());
};

const getFolderAutoScrollStep = (clientY: number, scrollContainer: HTMLDivElement): number => {
  const rect = scrollContainer.getBoundingClientRect();
  const topDistance = clientY - rect.top;
  const bottomDistance = rect.bottom - clientY;

  if (topDistance < FOLDER_AUTO_SCROLL_EDGE_PX) return -Math.ceil((1 - Math.max(0, topDistance) / FOLDER_AUTO_SCROLL_EDGE_PX) * FOLDER_AUTO_SCROLL_MAX_STEP);
  if (bottomDistance < FOLDER_AUTO_SCROLL_EDGE_PX) return Math.ceil((1 - Math.max(0, bottomDistance) / FOLDER_AUTO_SCROLL_EDGE_PX) * FOLDER_AUTO_SCROLL_MAX_STEP);
  return 0;
};

const isFolderRowEventTarget = (target: EventTarget | null): boolean => target instanceof HTMLElement && target.closest(FOLDER_TREE_ROW_SELECTOR) !== null;

const isAppendDropTarget = (dragState: FolderDragState, parentFolderId: string | null): boolean => dragState.dropInstruction?.position === "append" && dragState.dropInstruction.parentFolderId === parentFolderId;

const getFolderDropIndicatorLeft = (level: number): number => Math.max(0, level - ROOT_LEVEL) * FOLDER_TREE_INDENT_PX + FOLDER_DROP_INDICATOR_BASE_LEFT_PX;

const FolderDropIndicator = ({ position, left, className }: FolderDropIndicatorProps) => (
  <span aria-hidden="true" className={cn("pointer-events-none absolute left-0 right-2 z-10 flex h-0.5 items-center", position === "before" && "top-0", position === "after" && "bottom-0", position === "append" && "relative right-auto my-1", className)} style={{ paddingLeft: left }}>
    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8f8f8f]" />
    <span className="h-0.5 min-w-0 flex-1 rounded-full bg-[#8f8f8f]" />
  </span>
);

const useFolderTreeDnd = ({ rootFolders, rootDropParentId, scrollContainerRef, getChildFolders, updateFolder, setExpandedFolderIds }: UseFolderTreeDndParams) => {
  const folderMap = useMemo(() => createFolderMap(rootFolders, getChildFolders), [getChildFolders, rootFolders]);
  const autoExpandTimerRef = useRef<number | null>(null);
  const autoExpandTargetRef = useRef<string | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollStepRef = useRef(0);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [dragPayload, setDragPayload] = useState<FolderDragPayload | null>(null);
  const [dropInstruction, setDropInstruction] = useState<FolderDropInstruction | null>(null);

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

    const step = getFolderAutoScrollStep(event.clientY, scrollContainer);
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
    clearAutoExpandTimer();
    stopAutoScroll();
    setDraggingFolderId(null);
    setDragPayload(null);
    setDropInstruction(null);
  }, [clearAutoExpandTimer, stopAutoScroll]);

  const clearDropTarget = useCallback(() => {
    clearAutoExpandTimer();
    setDropInstruction(null);
  }, [clearAutoExpandTimer]);

  const getActiveDragSourceId = useCallback(() => resolveFolderDragSourceId(dragPayload?.entity.id ?? draggingFolderId), [dragPayload, draggingFolderId]);

  const scheduleAutoExpand = useCallback((instruction: FolderDropInstruction) => {
    if (instruction.position !== "inside" || !instruction.targetId) {
      clearAutoExpandTimer();
      return;
    }
    if (autoExpandTargetRef.current === instruction.targetId) return;

    clearAutoExpandTimer();
    autoExpandTargetRef.current = instruction.targetId;
    autoExpandTimerRef.current = window.setTimeout(() => {
      setExpandedFolderIds((current) => current.has(instruction.targetId!) ? current : new Set(current).add(instruction.targetId!));
      autoExpandTimerRef.current = null;
    }, FOLDER_AUTO_EXPAND_DELAY_MS);
  }, [clearAutoExpandTimer, setExpandedFolderIds]);

  const getValidDropInstruction = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string): FolderDropInstruction | null => {
    const sourceId = getActiveDragSourceId();
    if (!sourceId || sourceId === targetId) return null;

    const sourceFolder = folderMap.get(sourceId);
    const targetFolder = folderMap.get(targetId);
    if (!sourceFolder || !targetFolder) return null;

    const position = getFolderDropPosition(event);
    const parentFolderId = getFolderDropParentId(targetFolder, targetId, position);
    if (isFolderAncestorOf(sourceId, parentFolderId, getChildFolders)) return null;

    return { sourceId, targetId, position, parentFolderId };
  }, [folderMap, getActiveDragSourceId, getChildFolders]);

  const getValidAppendDropInstruction = useCallback((): FolderDropInstruction | null => {
    const sourceId = getActiveDragSourceId();
    if (!sourceId) return null;
    if (!folderMap.has(sourceId)) return null;
    if (isFolderAncestorOf(sourceId, rootDropParentId, getChildFolders)) return null;
    return { sourceId, targetId: null, position: "append", parentFolderId: rootDropParentId };
  }, [folderMap, getActiveDragSourceId, getChildFolders, rootDropParentId]);

  const commitFolderDrop = useCallback(async (instruction: FolderDropInstruction) => {
    const sourceFolder = folderMap.get(instruction.sourceId);
    const targetFolder = instruction.targetId ? folderMap.get(instruction.targetId) ?? null : null;
    if (!sourceFolder) return;
    if (instruction.targetId && !targetFolder) return;

    const targetParentId = instruction.parentFolderId;
    if (isFolderAncestorOf(instruction.sourceId, targetParentId, getChildFolders)) return;

    const nextSiblings = createReorderedSiblingList(sourceFolder, targetFolder, targetParentId, instruction.position, rootFolders, getChildFolders);

    for (const [orderIndex, folder] of nextSiblings.entries()) {
      const folderId = getFolderId(folder);
      if (!folderId) continue;

      const currentParentId = getParentFolderId(folder);
      const currentOrderIndex = getFolderOrderIndex(folder);
      if (currentParentId === targetParentId && currentOrderIndex === orderIndex) continue;

      await updateFolder(folderId, { parentFolderId: targetParentId, orderIndex });
    }

    if (instruction.position === "inside" && instruction.targetId) {
      setExpandedFolderIds((current) => new Set(current).add(instruction.targetId!));
    }
  }, [folderMap, getChildFolders, rootFolders, setExpandedFolderIds, updateFolder]);

  const handleFolderDragStart = useCallback((event: ReactDragEvent<HTMLElement>, folderId: string) => {
    const payload = createFolderDragPayload(folderId);
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(FOLDER_DND_MIME_TYPE, payload.entity.id);
    event.dataTransfer.setData("text/plain", payload.entity.id);
    applyFolderDragPreview(event);
    setDraggingFolderId(payload.entity.id);
    setDragPayload(payload);
  }, []);

  const handleFolderDragOver = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string) => {
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
    setDropInstruction((current) => isDropInstructionEqual(current, instruction) ? current : instruction);
  }, [clearDropTarget, getValidDropInstruction, scheduleAutoExpand, scheduleAutoScroll]);

  const handleFolderDragLeave = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;

    setDropInstruction((current) => {
      if (current?.targetId !== targetId) return current;
      clearAutoExpandTimer();
      return null;
    });
  }, [clearAutoExpandTimer]);

  const handleFolderDrop = useCallback((event: ReactDragEvent<HTMLElement>, targetId: string) => {
    const instruction = getValidDropInstruction(event, targetId);
    event.stopPropagation();

    if (!instruction) {
      clearDropTarget();
      stopAutoScroll();
      return;
    }

    event.preventDefault();
    setDropInstruction(null);
    void commitFolderDrop(instruction).finally(clearDragState);
  }, [clearDragState, clearDropTarget, commitFolderDrop, getValidDropInstruction, stopAutoScroll]);

  const handleFolderListDragOver = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (isFolderRowEventTarget(event.target)) return;
    scheduleAutoScroll(event);
    const instruction = getValidAppendDropInstruction();
    if (!instruction) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    clearAutoExpandTimer();
    setDropInstruction((current) => isDropInstructionEqual(current, instruction) ? current : instruction);
  }, [clearAutoExpandTimer, getValidAppendDropInstruction, scheduleAutoScroll]);

  const handleFolderListDragLeave = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
    clearDropTarget();
    stopAutoScroll();
  }, [clearDropTarget, stopAutoScroll]);

  const handleFolderListDrop = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (isFolderRowEventTarget(event.target)) return;
    const instruction = getValidAppendDropInstruction();
    if (!instruction) return;

    event.preventDefault();
    event.stopPropagation();
    setDropInstruction(null);
    void commitFolderDrop(instruction).finally(clearDragState);
  }, [clearDragState, commitFolderDrop, getValidAppendDropInstruction]);

  useEffect(() => () => {
    clearAutoExpandTimer();
    stopAutoScroll();
  }, [clearAutoExpandTimer, stopAutoScroll]);

  return { dragState: { draggingFolderId, dragPayload, dropInstruction }, handleFolderDragStart, handleFolderDragOver, handleFolderDragLeave, handleFolderDrop, handleFolderDragEnd: clearDragState, handleFolderListDragOver, handleFolderListDragLeave, handleFolderListDrop };
};

export { FOLDER_DROP_INDICATOR_ROOT_LEFT_PX, FolderDropIndicator, getFolderDropIndicatorLeft, isAppendDropTarget, useFolderTreeDnd };
export type { FolderDragState };
