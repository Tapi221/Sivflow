import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { CodeBlockItem } from "@/components/card/blocks/code/CodeBlockItem";
import { BlockList } from "@/components/card/blocks/core/BlockList";
import { BlockToolbar } from "@/components/card/blocks/core/BlockToolbar";
import { hasRuledLine } from "@/components/card/blocks/core/blockDisplayPolicy";
import { sortBlocksByOrderIndex } from "@/components/card/blocks/core/blockOrdering";
import { MediaBlock } from "@/components/card/blocks/image/MediaBlock";
import { MarkdownBlock } from "@/components/card/blocks/markdown/MarkdownBlock";
import { MathBlock } from "@/components/card/blocks/math/MathBlock";
import { QuestionBlock } from "@/components/card/blocks/question/QuestionBlock";
import { TextBlock } from "@/components/card/blocks/text/TextBlock";
import { CARD_ROW_PX } from "@/components/card/common/constants";
import {
  getNormalizedGridOffsetRows,
  getNormalizedRowOffset,
  isGridOffsetType,
  isRowPositionableType,
} from "@/components/card/frame/rowOffset";
import { cn } from "@/lib/utils";
import type { CardBlock } from "@/types/domain/card";

type CssVars = React.CSSProperties & Record<`--${string}`, string>;

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export interface BlockEditorHandle {
  addBlock: (type: CardBlock["type"]) => void;
}

interface BlockEditorProps {
  blocks: CardBlock[];
  onChange: (blocks: CardBlock[]) => void;
  selectionScopeKey?: string | null;
  prefix: "question" | "answer";
  label: string;
  color: string;
  droppableId: string;
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
  enableBlockActiveState?: boolean;
}

const ROW_STEP_PX = CARD_ROW_PX;
const EMPTY_HIDDEN_BLOCK_TYPES: CardBlock["type"][] = [];

export const BlockEditor = React.forwardRef<
  BlockEditorHandle,
  BlockEditorProps
>(
  (
    {
      blocks = [],
      onChange,
      selectionScopeKey = null,
      prefix,
      label,
      droppableId,
      accentColor,
      duplicateToOpposite = false,
      onCrossDuplicate,
      autoFocus = false,
      customPlaceholders,
      hideToolbar = false,
      onDelete,
      minDeletableIndex = 0,
      hiddenBlockTypes = EMPTY_HIDDEN_BLOCK_TYPES,
      settings = undefined,
      toolbarMount = null,
      toolbarDesktopLayout = "horizontal",
      enableBlockActiveState = true,
    },
    ref,
  ) => {
    void droppableId;
    void selectionScopeKey;

    const [activeContainerBlockId, setActiveContainerBlockId] = useState<
      string | null
    >(null);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const editorRootStyle = useMemo<CssVars | undefined>(() => {
      if (enableBlockActiveState) return undefined;
      return {
        "--card-ruled-line-px": "0px",
      };
    }, [enableBlockActiveState]);

    const orderedBlocks = useMemo(
      () => sortBlocksByOrderIndex(blocks),
      [blocks],
    );

    const { bodyBlocks, nonBodyBlocks } = useMemo(() => {
      const nextBodyBlocks: CardBlock[] = [];
      const nextNonBodyBlocks: CardBlock[] = [];

      for (const block of orderedBlocks) {
        if (block.type === "reference" || block.type === "audio") {
          nextNonBodyBlocks.push(block);
          continue;
        }
        if (!block.parentBlockId) {
          nextBodyBlocks.push(block);
        }
      }

      return {
        bodyBlocks: nextBodyBlocks,
        nonBodyBlocks: nextNonBodyBlocks,
      };
    }, [orderedBlocks]);

    const nonBodyBlocksRef = useRef<CardBlock[]>(nonBodyBlocks);
    useEffect(() => {
      nonBodyBlocksRef.current = nonBodyBlocks;
    }, [nonBodyBlocks]);

    const resolvedActiveBlockId = useMemo(() => {
      if (!enableBlockActiveState) return null;
      if (!activeBlockId) return null;
      return bodyBlocks.some((block) => block.id === activeBlockId)
        ? activeBlockId
        : null;
    }, [activeBlockId, bodyBlocks, enableBlockActiveState]);

    const resolvedActiveContainerBlockId = useMemo(() => {
      if (!enableBlockActiveState) return null;
      if (!activeContainerBlockId) return null;
      return bodyBlocks.some(
        (block) =>
          block.id === activeContainerBlockId && block.type === "question",
      )
        ? activeContainerBlockId
        : null;
    }, [activeContainerBlockId, bodyBlocks, enableBlockActiveState]);

    const reindexBlocks = useCallback(
      (arr: CardBlock[]) => arr.map((b, i) => ({ ...b, orderIndex: i })),
      [],
    );

    const emitChange = useCallback(
      (nextBodyBlocks: CardBlock[], opts?: { reindex?: boolean }) => {
        const merged = [...nextBodyBlocks, ...nonBodyBlocksRef.current];
        onChange(opts?.reindex ? reindexBlocks(merged) : merged);
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

    const blocksRef = useRef<CardBlock[]>(bodyBlocks);
    useEffect(() => {
      blocksRef.current = bodyBlocks;
    }, [bodyBlocks]);

    const rowElMapRef = useRef<Map<string, HTMLElement>>(new Map());
    const registerRowEl = useCallback(
      (blockId: string, el: HTMLElement | null) => {
        const map = rowElMapRef.current;
        if (!el) {
          map.delete(blockId);
          return;
        }
        map.set(blockId, el);
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
        '[data-card-surface="true"]',
      ) as HTMLElement | null;
      if (!surfaceEl) {
        return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };
      }

      const rowRect = rowEl.getBoundingClientRect();
      const surfaceRect = surfaceEl.getBoundingClientRect();
      const surfaceStyle = window.getComputedStyle(surfaceEl);
      const ruledTopOffsetPx = Math.max(
        0,
        Number.parseFloat(surfaceStyle.getPropertyValue("--ruled-offset-px")) ||
          0,
      );
      const ruledBottomOffsetPx = Math.max(
        0,
        Number.parseFloat(
          surfaceStyle.getPropertyValue("--ruled-bottom-offset-px"),
        ) || 0,
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
      const index = source.findIndex((b) => b.id === blockId);
      if (index === -1) return;

      const baseOffset = getBlockOffsetRows(source[index]);

      const pendingEntries: Array<{ id: string; file: File }> = [];
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
        if (type === "reference" || type === "audio") return;

        const source = blocksRef.current;

        const resolvedContainerId =
          type === "question"
            ? null
            : overrideContainerId !== undefined
              ? overrideContainerId
              : resolvedActiveContainerBlockId;

        const tailRowOffset = (() => {
          for (let i = source.length - 1; i >= 0; i -= 1) {
            const b = source[i];
            if (!isRowPositionableType(b.type) || isGridOffsetType(b.type)) {
              continue;
            }
            if (b.rowOffset !== undefined) {
              return Math.round(Number(b.rowOffset ?? 0));
            }
          }
          return 0;
        })();

        const tailGridOffsetRows = (() => {
          for (let i = source.length - 1; i >= 0; i -= 1) {
            const b = source[i];
            if (!isGridOffsetType(b.type)) continue;
            return getNormalizedGridOffsetRows(b);
          }
          return 0;
        })();

        const newBlock: CardBlock = {
          id: `${prefix}-${type}-${uid()}`,
          type,
          content: "",
          images: [],
          audios: [],
          code:
            type === "code" ? { language: "javascript", code: "" } : undefined,
          math:
            type === "math" ? { latex: "", displayMode: "block" } : undefined,
          markdown: type === "markdown" ? "" : undefined,
          questionTitle: type === "question" ? "" : undefined,
          questionAnswer: type === "question" ? "" : undefined,
          rowOffset:
            isRowPositionableType(type) && !isGridOffsetType(type)
              ? tailRowOffset
              : undefined,
          offsetRows: isGridOffsetType(type)
            ? Math.max(0, tailGridOffsetRows)
            : undefined,
          parentBlockId: resolvedContainerId ?? undefined,
          orderIndex: 0,
        };

        const next = [...source, newBlock];
        blocksRef.current = next;
        emitChange(next, { reindex: true });
      },
      [emitChange, prefix, resolvedActiveContainerBlockId],
    );

    useImperativeHandle(ref, () => ({
      addBlock: (type: CardBlock["type"]) => {
        handleAddBlock(type, null);
      },
    }));

    const handleUpdateBlock = (id: string, updates: Partial<CardBlock>) => {
      const source = blocksRef.current;
      const next = source.map((b) => (b.id === id ? { ...b, ...updates } : b));
      blocksRef.current = next;
      emitChange(next);
    };

    const handleDeleteBlock = (id: string, index?: number) => {
      if (index != null && index < minDeletableIndex) return;
      if (onDelete && index !== undefined) {
        onDelete(index);
        return;
      }

      const source = blocksRef.current;
      const next = source.filter((b) => b.id !== id && b.parentBlockId !== id);
      blocksRef.current = next;
      emitChange(next, { reindex: true });
    };

    const handleDuplicateBlock = (id: string) => {
      const source = blocksRef.current;
      const index = source.findIndex((b) => b.id === id);
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
      const currentBlock = source.find((b) => b.id === blockId);
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

      const next = source.map((b) => {
        if (b.id !== blockId) return b;
        if (isGridOffsetType(b.type)) {
          return { ...b, offsetRows: nextOffsetRows, rowOffset: undefined };
        }
        return { ...b, rowOffset: nextOffsetRows };
      });
      blocksRef.current = next;
      emitChange(next);
    };

    const handleMoveDragStart = (blockId: string) => {
      const source = blocksRef.current;
      const currentBlock = source.find((b) => b.id === blockId);
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
      const movedBlock = source.find((b) => b.id === blockId);
      if (!movedBlock) return;
      if (!isRowPositionableType(movedBlock.type)) return;

      const movedEl = rowElMapRef.current.get(blockId) ?? null;
      if (!movedEl) return;

      const movedRect = movedEl.getBoundingClientRect();
      const candidates = session.candidates;

      const hasCollision = candidates.some((el) => {
        if (el === movedEl) return false;
        const rect = el.getBoundingClientRect();
        const horizontalOverlap =
          movedRect.left < rect.right && movedRect.right > rect.left;
        const verticalOverlap =
          movedRect.top < rect.bottom && movedRect.bottom > rect.top;
        return horizontalOverlap && verticalOverlap;
      });

      if (!hasCollision) return;

      const reverted = source.map((b) => {
        if (b.id !== blockId) return b;
        if (isGridOffsetType(b.type)) {
          return {
            ...b,
            offsetRows: session.originOffsetRows,
            rowOffset: undefined,
          };
        }
        return { ...b, rowOffset: session.originOffsetRows };
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

    return (
      <div
        ref={rootRef}
        style={editorRootStyle}
        className={cn(
          "space-y-0",
          prefix === "question" ? "js-question-editor" : "js-answer-editor",
        )}
        onPointerDownCapture={(e) => {
          if (!enableBlockActiveState) return;
          const target = e.target;
          if (!(target instanceof HTMLElement)) return;
          const nextActiveBlockId =
            target.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ??
            null;
          setActiveBlockId((prev) =>
            prev === nextActiveBlockId ? prev : nextActiveBlockId,
          );
        }}
        onFocusCapture={(e) => {
          if (!enableBlockActiveState) return;
          const target = e.target;
          if (!(target instanceof HTMLElement)) return;
          const nextActiveBlockId =
            target.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ??
            null;
          if (nextActiveBlockId) {
            setActiveBlockId((prev) =>
              prev === nextActiveBlockId ? prev : nextActiveBlockId,
            );
          }
        }}
        onClick={(e) => {
          if (!enableBlockActiveState) return;
          const target = e.target as HTMLElement;
          if (!target.closest("[data-block-type='question']")) {
            setActiveContainerBlockId((prev) => (prev === null ? prev : null));
          }
        }}
      >
        {toolbarNode && toolbarMount
          ? createPortal(toolbarNode, toolbarMount)
          : inlineToolbar}

        <div className="space-y-0 overflow-x-visible overflow-y-visible">
          <BlockList
            blocks={bodyBlocks}
            getRowRef={(block) => (el) => {
              registerRowEl(block.id, el);
            }}
            getRowContainerProps={(block, meta) => ({
              className: "relative",
              "data-block-id": block.id,
              "data-block-layout-kind": hasRuledLine(block.type)
                ? "ruled"
                : "non-ruled",
              "data-row-offset-applied": meta.rowOffsetPx ? "true" : undefined,
            })}
            renderBlock={(block, meta) => {
              const isBlockActive = resolvedActiveBlockId === block.id;
              const canMoveUp = meta.isLinePositionable;
              const canMoveDown = meta.isLinePositionable;

              if (block.type === "text") {
                return (
                  <TextBlock
                    content={block.content || ""}
                    onChange={(content) =>
                      handleUpdateBlock(block.id, { content })
                    }
                    onDelete={() => handleDeleteBlock(block.id, meta.index)}
                    onDuplicate={() => handleDuplicateBlock(block.id)}
                    onMoveUp={() => handleShiftBlockRow(block.id, "up")}
                    onMoveDown={() => handleShiftBlockRow(block.id, "down")}
                    onMoveDragStart={() => handleMoveDragStart(block.id)}
                    onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    dragHandleProps={undefined}
                    dragEnabled={true}
                    dragHandleClassName="js-block-drag-handle"
                    accentColor={accentColor}
                    isActive={isBlockActive}
                    placeholder={
                      customPlaceholders?.[meta.index] || "文章を入力..."
                    }
                    autoFocus={
                      autoFocus && meta.index === bodyBlocks.length - 1
                    }
                  />
                );
              }

              if (block.type === "code") {
                return (
                  <div className="w-full max-w-full overflow-visible">
                    {meta.gridOffsetPx > 0 && (
                      <div
                        aria-hidden
                        className="pointer-events-none"
                        style={{ height: `${meta.gridOffsetPx}px` }}
                      />
                    )}
                    <CodeBlockItem
                      data={
                        block.code || {
                          language: "javascript",
                          code: "",
                        }
                      }
                      onChange={(data) =>
                        handleUpdateBlock(block.id, { code: data })
                      }
                      onDelete={() => handleDeleteBlock(block.id, meta.index)}
                      onDuplicate={() => handleDuplicateBlock(block.id)}
                      onMoveUp={() => handleShiftBlockRow(block.id, "up")}
                      onMoveDown={() => handleShiftBlockRow(block.id, "down")}
                      onMoveDragStart={() => handleMoveDragStart(block.id)}
                      onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                      dragHandleProps={undefined}
                      dragEnabled={true}
                      dragHandleClassName="js-block-drag-handle"
                      accentColor={accentColor}
                      isActive={isBlockActive}
                    />
                  </div>
                );
              }

              if (block.type === "image") {
                return (
                  <MediaBlock
                    data={block.images || []}
                    onChange={(data) =>
                      handleUpdateBlock(block.id, { images: data })
                    }
                    onDelete={() => handleDeleteBlock(block.id, meta.index)}
                    onDuplicate={() => handleDuplicateBlock(block.id)}
                    dragHandleProps={undefined}
                    dragHandleClassName="js-block-drag-handle"
                    accentColor={accentColor}
                    isActive={isBlockActive}
                    initialFile={pendingUploads[block.id]}
                    onConsumeInitialFile={() =>
                      handleConsumeInitialFile(block.id)
                    }
                    onFilesExcess={(files) =>
                      handleBlockOverflow(block.id, files)
                    }
                    onMoveUp={() => handleShiftBlockRow(block.id, "up")}
                    onMoveDown={() => handleShiftBlockRow(block.id, "down")}
                    onMoveDragStart={() => handleMoveDragStart(block.id)}
                    onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                  />
                );
              }

              if (block.type === "math") {
                return (
                  <div className="w-full max-w-full overflow-visible">
                    {meta.gridOffsetPx > 0 && (
                      <div
                        aria-hidden
                        className="pointer-events-none"
                        style={{ height: `${meta.gridOffsetPx}px` }}
                      />
                    )}
                    <MathBlock
                      data={
                        block.math || {
                          latex: "",
                          displayMode: "block",
                        }
                      }
                      onChange={(data) =>
                        handleUpdateBlock(block.id, { math: data })
                      }
                      onDelete={() => handleDeleteBlock(block.id, meta.index)}
                      onDuplicate={() => handleDuplicateBlock(block.id)}
                      dragHandleProps={undefined}
                      dragHandleClassName="js-block-drag-handle"
                      accentColor={accentColor}
                      isActive={isBlockActive}
                      onMoveUp={() => handleShiftBlockRow(block.id, "up")}
                      onMoveDown={() => handleShiftBlockRow(block.id, "down")}
                      onMoveDragStart={() => handleMoveDragStart(block.id)}
                      onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                    />
                  </div>
                );
              }

              if (block.type === "question") {
                return (
                  <QuestionBlock
                    block={block}
                    onUpdateBlock={handleUpdateBlock}
                    onDelete={() => handleDeleteBlock(block.id, meta.index)}
                    onDuplicate={() => handleDuplicateBlock(block.id)}
                    onMoveUp={() => handleShiftBlockRow(block.id, "up")}
                    onMoveDown={() => handleShiftBlockRow(block.id, "down")}
                    onMoveDragStart={() => handleMoveDragStart(block.id)}
                    onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    dragHandleProps={undefined}
                    dragEnabled={true}
                    dragHandleClassName="js-block-drag-handle"
                    accentColor={accentColor}
                    isActive={isBlockActive}
                  />
                );
              }

              if (block.type === "markdown") {
                return (
                  <MarkdownBlock
                    markdown={block.markdown || ""}
                    onChange={(md) =>
                      handleUpdateBlock(block.id, { markdown: md })
                    }
                    onDelete={() => handleDeleteBlock(block.id, meta.index)}
                    onDuplicate={() => handleDuplicateBlock(block.id)}
                    dragHandleProps={undefined}
                    dragHandleClassName="js-block-drag-handle"
                    accentColor={accentColor}
                    isActive={isBlockActive}
                    onMoveUp={() => handleShiftBlockRow(block.id, "up")}
                    onMoveDown={() => handleShiftBlockRow(block.id, "down")}
                    onMoveDragStart={() => handleMoveDragStart(block.id)}
                    onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onReplaceWithBlocks={(parsed) => {
                      const baseOffset = getBlockOffsetRows(block);

                      const newBlocks = parsed.map((p) => {
                        const newId = `${prefix}-${p.type}-${uid()}`;

                        if (isGridOffsetType(p.type)) {
                          return {
                            id: newId,
                            type: p.type,
                            ...(p.type === "code" ? { code: p.code } : {}),
                            content: "",
                            images: [],
                            audios: [],
                            offsetRows: Math.max(0, baseOffset),
                            rowOffset: undefined,
                            orderIndex: 0,
                          } as CardBlock;
                        }

                        return {
                          id: newId,
                          type: "markdown" as const,
                          markdown: p.markdown,
                          content: "",
                          images: [],
                          audios: [],
                          rowOffset: baseOffset,
                          orderIndex: 0,
                        } as CardBlock;
                      });

                      const source = blocksRef.current;
                      const updated = [...source];
                      updated.splice(meta.index, 1, ...newBlocks);

                      blocksRef.current = updated;
                      emitChange(updated, { reindex: true });
                    }}
                  />
                );
              }

              return null;
            }}
          />
        </div>
      </div>
    );
  },
);

BlockEditor.displayName = "BlockEditor";
