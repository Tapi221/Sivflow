import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@web-renderer/lib/utils";
import { hasRuledLine } from "@/components/card/blocks/core/blockDisplayPolicy";
import type { BlockListRowMeta } from "@/components/card/blocks/core/BlockList";
import { sortBlocksByOrderIndex } from "@/components/card/blocks/core/blockOrdering";
import { BlockToolbar } from "@/components/card/blocks/core/BlockToolbar";
import { createEditorBlock, isEditorInsertableBlockType } from "./blockEditorInsertPolicy";
import type { CardBlockLayoutReplaceBlock, EditorProps } from "@/components/card/blocks/shared/CardBlockLayoutRenderer";
import { CardBlocksScene } from "@/components/card/blocks/shared/CardBlocksScene";
import { getNormalizedGridOffsetRows, getNormalizedRowOffset, isGridOffsetType, isRowPositionableType } from "@/components/card/frame/rowOffset";
import { CARD_ROW_PX } from "@/domain/card/cardGeometry.constants";
import type { CardBlock } from "@/types/domain/card";
import type { CardDisplayMode } from "@/types/domain/cardSet";



type CssVars = React.CSSProperties & Record<`--${string}`, string>;
interface BlockEditorProps {
  blocks: CardBlock[];
  onChange: (blocks: CardBlock[]) => void;
  prefix: "question" | "answer";
  label: string;
  accentColor?: string;
  duplicateToOpposite?: boolean;
  onCrossDuplicate?: (block: CardBlock) => void;
  autoFocus?: boolean;
  customPlaceholders?: Record<number, string>;
  hideToolbar?: boolean;
  onDelete?: (index: number) => void;
  minDeletableIndex?: number;
  hiddenBlockTypes?: CardBlock["type"][];
  settings?: unknown;
  toolbarMount?: HTMLDivElement | null;
  toolbarDesktopLayout?: "horizontal" | "vertical";
  enableBlockSelectionState?: boolean;
  displayMode?: CardDisplayMode;
  zoom?: number;
}
interface BlockEditorHandle {
  addBlock: (type: CardBlock["type"]) => void;
}



const ROW_STEP_PX = CARD_ROW_PX;
const EMPTY_HIDDEN_BLOCK_TYPES: CardBlock["type"][] = [];



const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);



const BlockEditor = React.forwardRef<BlockEditorHandle, BlockEditorProps>(({ blocks = [], onChange, prefix, label, accentColor, duplicateToOpposite = false, onCrossDuplicate, autoFocus = false, customPlaceholders, hideToolbar = false, onDelete, minDeletableIndex = 0, hiddenBlockTypes = EMPTY_HIDDEN_BLOCK_TYPES, settings = undefined, toolbarMount = null, toolbarDesktopLayout = "horizontal", enableBlockSelectionState = true, displayMode = "fixed", zoom = 1 }, ref) => {
  const [selectedContainerBlockId, setSelectedContainerBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const editorRootStyle = useMemo<CssVars | undefined>(() => {
    if (enableBlockSelectionState) return undefined;
    return {
      "--card-ruled-line-px": "0px",
    };
  }, [enableBlockSelectionState]);

  const orderedBlocks = useMemo(
    () => sortBlocksByOrderIndex(blocks),
    [blocks],
  );

  const sceneBlocks = useMemo(
    () => orderedBlocks.filter((block) => !block.parentBlockId),
    [orderedBlocks],
  );

  const resolvedSelectedBlockId = useMemo(() => {
    if (!enableBlockSelectionState) return null;
    if (!selectedBlockId) return null;
    return sceneBlocks.some((block) => block.id === selectedBlockId)
      ? selectedBlockId
      : null;
  }, [selectedBlockId, sceneBlocks, enableBlockSelectionState]);

  const resolvedSelectedContainerBlockId = useMemo(() => {
    if (!enableBlockSelectionState) return null;
    if (!selectedContainerBlockId) return null;
    return sceneBlocks.some(
      (block) =>
        block.id === selectedContainerBlockId && block.type === "question",
    )
      ? selectedContainerBlockId
      : null;
  }, [selectedContainerBlockId, sceneBlocks, enableBlockSelectionState]);

  const reindexBlocks = useCallback(
    (arr: CardBlock[]) =>
      arr.map((block, index) => ({ ...block, orderIndex: index })),
    [],
  );

  const emitChange = useCallback(
    (nextBlocks: CardBlock[], opts?: { reindex?: boolean; }) => {
      onChange(opts?.reindex ? reindexBlocks(nextBlocks) : nextBlocks);
    },
    [onChange, reindexBlocks],
  );

  const [pendingUploads, setPendingUploads] = useState<Record<string, File>>(
    {},
  );
  const pendingUploadsRef = useRef<Record<string, File>>({});
  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  const blocksRef = useRef<CardBlock[]>(sceneBlocks);
  useEffect(() => {
    blocksRef.current = sceneBlocks;
  }, [sceneBlocks]);

  const rowElMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const registerRowEl = useCallback(
    (blockId: string, element: HTMLElement | null) => {
      const map = rowElMapRef.current;
      if (!element) {
        map.delete(blockId);
        return;
      }
      map.set(blockId, element);
    },
    [],
  );

  const moveSessionRef = useRef<{
    blockId: string;
    originOffsetRows: number;
    candidates: HTMLElement[];
  } | null>(null);

  const getBlockOffsetRows = (block: CardBlock) => {
    if (isGridOffsetType(block.type)) {
      return getNormalizedGridOffsetRows(block);
    }
    return getNormalizedRowOffset(block);
  };

  const getRowOffsetBoundsWithinCard = (
    blockId: string,
    currentOffset: number,
    useContentTopForMin = false,
  ) => {
    if (typeof document === "undefined") {
      return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };
    }

    const rowEl = rowElMapRef.current.get(blockId) ?? null;
    if (!rowEl) {
      return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };
    }

    const surfaceEl = rowEl.closest(
      "[data-card-surface=\"true\"]",
    ) as HTMLElement | null;
    if (!surfaceEl) {
      return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };
    }

    const rowRect = rowEl.getBoundingClientRect();
    const surfaceRect = surfaceEl.getBoundingClientRect();
    const surfaceStyle = window.getComputedStyle(surfaceEl);
    const ruledTopOffsetPx = Math.max(
      0,
      Number.parseFloat(surfaceStyle.getPropertyValue("--ruled-offset-px")) ??
      0,
    );
    const ruledBottomOffsetPx = Math.max(
      0,
      Number.parseFloat(
        surfaceStyle.getPropertyValue("--ruled-bottom-offset-px"),
      ) ?? 0,
    );
    const rawSurfaceScaleY =
      surfaceEl.offsetHeight > 0
        ? surfaceRect.height / surfaceEl.offsetHeight
        : 1;
    const surfaceScaleY =
      Number.isFinite(rawSurfaceScaleY) && rawSurfaceScaleY > 0
        ? rawSurfaceScaleY
        : 1;
    const stepPx = ROW_STEP_PX * surfaceScaleY;
    const epsilon = stepPx * 0.01;

    const topLineY = surfaceRect.top + ruledTopOffsetPx * surfaceScaleY;
    const bottomLineY =
      surfaceRect.bottom - ruledBottomOffsetPx * surfaceScaleY;
    const minAnchorTopY = useContentTopForMin
      ? rowRect.top + currentOffset * stepPx
      : rowRect.top;
    const upRows = Math.floor((minAnchorTopY - topLineY + epsilon) / stepPx);
    const downRows = Math.floor(
      (bottomLineY - rowRect.bottom + epsilon) / stepPx,
    );

    return {
      min: currentOffset - Math.max(0, upRows),
      max: currentOffset + Math.max(0, downRows),
    };
  };

  const handleBlockOverflow = (blockId: string, files: File[]) => {
    const source = blocksRef.current;
    const index = source.findIndex((block) => block.id === blockId);
    if (index === -1) return;

    const baseOffset = getBlockOffsetRows(source[index]);

    const pendingEntries: Array<{ id: string; file: File; }> = [];
    const newBlocks = [...source];
    let insertIndex = index + 1;

    for (const file of files) {
      const newBlockId = `${prefix}-image-${uid()}`;
      const newBlock: CardBlock = {
        id: newBlockId,
        type: "image",
        images: [],
        audios: [],
        content: "",
        rowOffset: baseOffset,
        orderIndex: 0,
      };

      newBlocks.splice(insertIndex, 0, newBlock);
      pendingEntries.push({ id: newBlockId, file });
      insertIndex += 1;
    }

    const nextPending = { ...pendingUploadsRef.current };
    for (const entry of pendingEntries) {
      nextPending[entry.id] = entry.file;
    }
    pendingUploadsRef.current = nextPending;
    setPendingUploads(nextPending);
    blocksRef.current = newBlocks;
    emitChange(newBlocks, { reindex: true });
  };

  const handleConsumeInitialFile = (blockId: string) => {
    setPendingUploads((prev) => {
      const next = { ...prev };
      delete next[blockId];
      pendingUploadsRef.current = next;
      return next;
    });
  };

  const handleAddBlock = useCallback(
    (type: CardBlock["type"], overrideContainerId?: string | null) => {
      if (!isEditorInsertableBlockType(type)) return;

      const source = blocksRef.current;

      const resolvedContainerId =
        type === "question"
          ? null
          : overrideContainerId !== undefined
            ? overrideContainerId
            : resolvedSelectedContainerBlockId;

      const tailRowOffset = (() => {
        for (let index = source.length - 1; index >= 0; index -= 1) {
          const block = source[index];
          if (
            !isRowPositionableType(block.type) ||
            isGridOffsetType(block.type)
          ) {
            continue;
          }
          if (block.rowOffset !== undefined) {
            return Math.round(Number(block.rowOffset ?? 0));
          }
        }
        return 0;
      })();

      const tailGridOffsetRows = (() => {
        for (let index = source.length - 1; index >= 0; index -= 1) {
          const block = source[index];
          if (!isGridOffsetType(block.type)) continue;
          return getNormalizedGridOffsetRows(block);
        }
        return 0;
      })();

      const next = [
        ...source,
        createEditorBlock({
          prefix,
          type,
          id: `${prefix}-${type}-${uid()}`,
          rowOffset: tailRowOffset,
          offsetRows: tailGridOffsetRows,
          parentBlockId: resolvedContainerId ?? undefined,
        }),
      ];

      blocksRef.current = next;
      emitChange(next, { reindex: true });
    },
    [emitChange, prefix, resolvedSelectedContainerBlockId],
  );

  useImperativeHandle(ref, () => ({
    addBlock: (type: CardBlock["type"]) => {
      handleAddBlock(type, null);
    },
  }));

  const handleUpdateBlock = (id: string, updates: Partial<CardBlock>) => {
    const source = blocksRef.current;
    const next = source.map((block) =>
      block.id === id ? { ...block, ...updates } : block,
    );
    blocksRef.current = next;
    emitChange(next);
  };

  const handleDeleteBlock = (id: string, index?: number) => {
    if ((index !== null && index !== undefined) && index < minDeletableIndex) return;
    if (onDelete && index !== undefined) {
      onDelete(index);
      return;
    }

    const source = blocksRef.current;
    const next = source.filter(
      (block) => block.id !== id && block.parentBlockId !== id,
    );
    blocksRef.current = next;
    emitChange(next, { reindex: true });
  };

  const handleDuplicateBlock = (id: string) => {
    const source = blocksRef.current;
    const index = source.findIndex((block) => block.id === id);
    if (index === -1) return;

    const original = source[index];

    if (duplicateToOpposite && onCrossDuplicate) {
      onCrossDuplicate(original);
      return;
    }

    const duplicate: CardBlock = {
      ...original,
      id: `${prefix}-${original.type}-${uid()}`,
      orderIndex: 0,
    };

    const next = [...source];
    next.splice(index + 1, 0, duplicate);
    blocksRef.current = next;
    emitChange(next, { reindex: true });
  };

  const handleShiftBlockRow = (blockId: string, direction: "up" | "down") => {
    const delta = direction === "up" ? -1 : 1;
    const source = blocksRef.current;
    const currentBlock = source.find((block) => block.id === blockId);
    if (!currentBlock) return;
    if (!isRowPositionableType(currentBlock.type)) return;

    const currentOffsetRows = getBlockOffsetRows(currentBlock);
    const bounds = getRowOffsetBoundsWithinCard(
      blockId,
      currentOffsetRows,
      isGridOffsetType(currentBlock.type),
    );
    const nextOffsetRowsRaw = currentOffsetRows + delta;
    const boundedMin = isGridOffsetType(currentBlock.type)
      ? Math.max(0, bounds.min)
      : bounds.min;
    const nextOffsetRows = Math.min(
      Math.max(nextOffsetRowsRaw, boundedMin),
      bounds.max,
    );
    if (nextOffsetRows === currentOffsetRows) return;

    const next = source.map((block) => {
      if (block.id !== blockId) return block;
      if (isGridOffsetType(block.type)) {
        return { ...block, offsetRows: nextOffsetRows, rowOffset: undefined };
      }
      return { ...block, rowOffset: nextOffsetRows };
    });
    blocksRef.current = next;
    emitChange(next);
  };

  const handleMoveDragStart = (blockId: string) => {
    const source = blocksRef.current;
    const currentBlock = source.find((block) => block.id === blockId);
    if (!currentBlock) return;
    if (!isRowPositionableType(currentBlock.type)) return;

    const candidates = Array.from(rowElMapRef.current.values());

    moveSessionRef.current = {
      blockId,
      originOffsetRows: getBlockOffsetRows(currentBlock),
      candidates,
    };
  };

  const handleMoveDragEnd = (blockId: string) => {
    const session = moveSessionRef.current;
    moveSessionRef.current = null;
    if (!session || session.blockId !== blockId) return;

    const source = blocksRef.current;
    const movedBlock = source.find((block) => block.id === blockId);
    if (!movedBlock) return;
    if (!isRowPositionableType(movedBlock.type)) return;

    const movedEl = rowElMapRef.current.get(blockId) ?? null;
    if (!movedEl) return;

    const movedRect = movedEl.getBoundingClientRect();
    const candidates = session.candidates;

    const hasCollision = candidates.some((element) => {
      if (element === movedEl) return false;
      const rect = element.getBoundingClientRect();
      const horizontalOverlap =
        movedRect.left < rect.right && movedRect.right > rect.left;
      const verticalOverlap =
        movedRect.top < rect.bottom && movedRect.bottom > rect.top;
      return horizontalOverlap && verticalOverlap;
    });

    if (!hasCollision) return;

    const reverted = source.map((block) => {
      if (block.id !== blockId) return block;
      if (isGridOffsetType(block.type)) {
        return {
          ...block,
          offsetRows: session.originOffsetRows,
          rowOffset: undefined,
        };
      }
      return { ...block, rowOffset: session.originOffsetRows };
    });
    blocksRef.current = reverted;
    emitChange(reverted);
  };

  const toolbarNode = hideToolbar ? null : (
    <BlockToolbar
      label={label}
      onAddBlock={handleAddBlock}
      settings={settings}
      hiddenBlockTypes={hiddenBlockTypes}
      desktopLayout={toolbarDesktopLayout}
    />
  );

  const inlineToolbar = toolbarNode && !toolbarMount ? toolbarNode : null;
  const resolvedEditorZoom = displayMode === "fluid" ? zoom : 1;

  const resolveEditorProps = (
    block: CardBlock,
    meta: BlockListRowMeta,
  ): EditorProps => {
    const isBlockSelected = resolvedSelectedBlockId === block.id;
    const canMoveUp = meta.isLinePositionable;
    const canMoveDown = meta.isLinePositionable;

    const handleReplaceMarkdownWithBlocks = (
      parsed: CardBlockLayoutReplaceBlock[],
    ) => {
      if (block.type !== "markdown") return;

      const baseOffset = getBlockOffsetRows(block);

      const newBlocks = parsed.map((item) => {
        const newId = `${prefix}-${item.type}-${uid()}`;
        if (item.type === "code") {
          return {
            id: newId,
            type: "code" as const,
            code: item.code,
            content: "",
            images: [],
            audios: [],
            offsetRows: Math.max(0, baseOffset),
            rowOffset: undefined,
            orderIndex: 0,
          } satisfies CardBlock;
        }

        return {
          id: newId,
          type: "markdown" as const,
          markdown: item.markdown,
          content: "",
          images: [],
          audios: [],
          rowOffset: baseOffset,
          orderIndex: 0,
        } satisfies CardBlock;
      });

      const source = blocksRef.current;
      const updated = [...source];
      updated.splice(meta.index, 1, ...newBlocks);

      blocksRef.current = updated;
      emitChange(updated, { reindex: true });
    };

    return {
      onUpdateBlock: handleUpdateBlock,
      onDelete: () => handleDeleteBlock(block.id, meta.index),
      onDuplicate: () => handleDuplicateBlock(block.id),
      onMoveUp: () => handleShiftBlockRow(block.id, "up"),
      onMoveDown: () => handleShiftBlockRow(block.id, "down"),
      onMoveDragStart: () => handleMoveDragStart(block.id),
      onMoveDragEnd: () => handleMoveDragEnd(block.id),
      canMoveUp,
      canMoveDown,
      accentColor,
      isBlockSelected,
      autoFocus: autoFocus && meta.index === sceneBlocks.length - 1,
      customPlaceholder: customPlaceholders?.[meta.index],
      pendingUploadFile: pendingUploads[block.id],
      onConsumePendingUpload: () => handleConsumeInitialFile(block.id),
      onFilesExcess: (files) => handleBlockOverflow(block.id, files),
      onReplaceMarkdownWithBlocks:
        block.type === "markdown"
          ? handleReplaceMarkdownWithBlocks
          : undefined,
      displayMode,
      zoom: resolvedEditorZoom,
    };
  };

  return (
    <div
      ref={rootRef}
      style={editorRootStyle}
      className={cn(
        "space-y-0",
        prefix === "question" ? "js-question-editor" : "js-answer-editor",
      )}
      onPointerDownCapture={(event) => {
        if (!enableBlockSelectionState) return;
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const nextSelectedBlockId =
          target.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ??
          null;
        setSelectedBlockId((prev) =>
          prev === nextSelectedBlockId ? prev : nextSelectedBlockId,
        );
      }}
      onFocusCapture={(event) => {
        if (!enableBlockSelectionState) return;
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const nextSelectedBlockId =
          target.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ??
          null;
        if (nextSelectedBlockId) {
          setSelectedBlockId((prev) =>
            prev === nextSelectedBlockId ? prev : nextSelectedBlockId,
          );
        }
      }}
      onClick={(event) => {
        if (!enableBlockSelectionState) return;
        const target = event.target as HTMLElement;
        if (!target.closest("[data-block-type='question']")) {
          setSelectedContainerBlockId((prev) =>
            prev === null ? prev : null,
          );
        }
      }}
    >
      {toolbarNode && toolbarMount
        ? createPortal(toolbarNode, toolbarMount)
        : inlineToolbar}

      <div className="space-y-0 overflow-x-visible overflow-y-visible">
        <CardBlocksScene
          blocks={sceneBlocks}
          getRowRef={(block) => (element) => {
            registerRowEl(block.id, element);
          }}
          getRowContainerProps={(block, meta) => ({
            className: "relative",
            "data-block-id": block.id,
            "data-block-layout-kind": hasRuledLine(block.type)
              ? "ruled"
              : "non-ruled",
            "data-row-offset-applied": meta.rowOffsetPx ? "true" : undefined,
          })}
          resolveSceneProps={(block, meta) => ({
            mode: "edit",
            editorProps: resolveEditorProps(block, meta),
          })}
        />
      </div>
    </div>
  );
},
);



BlockEditor.displayName = "BlockEditor";

export { BlockEditor };


export type { BlockEditorHandle };
