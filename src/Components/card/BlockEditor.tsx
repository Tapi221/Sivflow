import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Droppable, Draggable } from '@hello-pangea/dnd';

import { BlockToolbar } from './BlockToolbar';
import { TextBlock } from './blocks/TextBlock';
import { CodeBlockItem } from './blocks/CodeBlockItem';
import { MediaBlock } from './blocks/MediaBlock';
import { MathBlock } from './blocks/MathBlock';
import { MarkdownBlock } from './blocks/MarkdownBlock';

import type { CardBlock } from '@/types';
import { cn } from '@/lib/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { CARD_ROW_PX } from './constants';
import { sortBlocksByOrderIndex } from './blockOrdering';
import {
  getNormalizedGridOffsetRows,
  getNormalizedRowOffset,
  isGridOffsetType,
  isRowPositionableType,
} from './rowOffset';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export interface BlockEditorHandle {
  addBlock: (type: CardBlock['type']) => void;
}

interface BlockEditorProps {
  blocks: CardBlock[];
  onChange: (blocks: CardBlock[]) => void;
  prefix: 'question' | 'answer';
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
  hiddenBlockTypes?: CardBlock['type'][];

  toolbarMountRef?: React.RefObject<HTMLDivElement | null>;
}

type DndStyle = React.CSSProperties & { transform?: string };
const ROW_STEP_PX = CARD_ROW_PX;

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('input, textarea, select, [contenteditable]');
};

    // resize を rAF で間引く
const useRafThrottledCallback = (fn: () => void) => {
  const rafIdRef = useRef<number | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const schedule = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      fnRef.current();
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  return schedule;
};

export const BlockEditor = React.forwardRef<BlockEditorHandle, BlockEditorProps>(
  (
    {
      blocks = [],
      onChange,
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
      hiddenBlockTypes = [],
      toolbarMountRef,
    },
    ref
  ) => {
    const { settings } = useUserSettings();

    // reference/audio は本文ブロックじゃない扱い（ここでは編集しない）
    const orderedBlocks = useMemo(
      () => sortBlocksByOrderIndex(blocks),
      [blocks]
    );
    const nonBodyBlocks = useMemo(
      () => orderedBlocks.filter((b) => b.type === 'reference' || b.type === 'audio'),
      [orderedBlocks]
    );
    const nonBodyBlocksRef = useRef<CardBlock[]>(nonBodyBlocks);
    useEffect(() => {
      nonBodyBlocksRef.current = nonBodyBlocks;
    }, [nonBodyBlocks]);
    const bodyBlocks = useMemo(
      () => orderedBlocks.filter((b) => b.type !== 'reference' && b.type !== 'audio'),
      [orderedBlocks]
    );

    const reindexBlocks = useCallback(
      (arr: CardBlock[]) => arr.map((b, i) => ({ ...b, orderIndex: i })),
      []
    );

    // このエディタが責任を持つのは bodyBlocks のみ。emit 時に nonBody を末尾へ保持する。
    const emitChange = useCallback(
      (nextBodyBlocks: CardBlock[], opts?: { reindex?: boolean }) => {
        const merged = [...nextBodyBlocks, ...nonBodyBlocksRef.current];
        onChange(opts?.reindex ? reindexBlocks(merged) : merged);
      },
      [onChange, reindexBlocks]
    );

    const [pendingUploads, setPendingUploads] = useState<Record<string, File>>({});
    const pendingUploadsRef = useRef<Record<string, File>>({});
    useEffect(() => {
      pendingUploadsRef.current = pendingUploads;
    }, [pendingUploads]);

    // stale 回避用のスナップショット（唯一の真実は props と emitChange）
    const blocksRef = useRef<CardBlock[]>(bodyBlocks);
    useEffect(() => {
      blocksRef.current = bodyBlocks;
    }, [bodyBlocks]);

    // row DOM 参照（querySelector地獄を回避）
    const rowElMapRef = useRef<Map<string, HTMLElement>>(new Map());
    const registerRowEl = useCallback((blockId: string, el: HTMLElement | null) => {
      const map = rowElMapRef.current;
      if (!el) {
        map.delete(blockId);
        return;
      }
      map.set(blockId, el);
    }, []);

    // 1行移動ドラッグ用セッション（候補要素もキャッシュ）
    const moveSessionRef = useRef<{
      blockId: string;
      originOffsetRows: number;
      candidates: HTMLElement[];
    } | null>(null);

    // コンテナのスケール計測用
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [measurement, setMeasurement] = useState({ scale: 1 });

    const updateMeasurement = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const offsetW = el.offsetWidth;
      if (offsetW <= 0) return;

      const rawScale = rect.width / offsetW;
      const safeScale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
      const scale = Math.round(safeScale * 1000) / 1000;

      const nextMeasurement = {
        scale: scale > 0 ? scale : 1,
      };

      // 同値ならsetState抑止
      setMeasurement((prev) =>
        Math.abs(prev.scale - nextMeasurement.scale) < 0.001
          ? prev
          : nextMeasurement
      );
    }, []);

    const scheduleMeasurement = useRafThrottledCallback(updateMeasurement);

    useEffect(() => {
      updateMeasurement();

      const el = containerRef.current;
      if (!el) return;

      const obs = new ResizeObserver(() => scheduleMeasurement());
      obs.observe(el);

      window.addEventListener('resize', scheduleMeasurement, { passive: true });

      return () => {
        obs.disconnect();
        window.removeEventListener('resize', scheduleMeasurement);
      };
    }, [scheduleMeasurement, updateMeasurement]);

    useImperativeHandle(ref, () => ({
      addBlock: (type: CardBlock['type']) => {
        handleAddBlock(type);
      },
    }));

    const clampDragStyle = (
      style: React.CSSProperties | undefined,
      {
        clampXMin,
        clampXMax,
        clampYMin,
        clampYMax,
        scale = 1,
        extraTranslateY = 0,
      }: {
        clampXMin?: number;
        clampXMax?: number;
        clampYMin?: number;
        clampYMax?: number;
        scale?: number;
        extraTranslateY?: number;
      }
    ) => {
      if (!style) {
        return extraTranslateY
          ? ({ transform: `translateY(${extraTranslateY}px)` } as React.CSSProperties)
          : style;
      }

      const s = style as DndStyle | any;

      const result: any = { ...style };

      // transform 補正 (translate)
      if (s.transform) {
        const transform = String(s.transform);
        try {
          if (typeof DOMMatrixReadOnly !== 'undefined' && typeof DOMMatrix !== 'undefined') {
            const ro = new DOMMatrixReadOnly(transform);
            let x = ro.m41 / scale;
            let y = ro.m42 / scale;

            if (clampXMin !== undefined) x = Math.max(x, clampXMin);
            if (clampXMax !== undefined) x = Math.min(x, clampXMax);
            if (clampYMin !== undefined) y = Math.max(y, clampYMin);
            if (clampYMax !== undefined) y = Math.min(y, clampYMax);
            y += extraTranslateY;

            const m = new DOMMatrix(transform);
            m.m41 = x;
            m.m42 = y;
            result.transform = m.toString();
          } else {
            const match = transform.match(
              /translate(?:3d)?\(([-\d.]+)px,\s*([-\d.]+)px(?:,\s*([-\d.]+)px)?\)/
            );
            if (!match) {
              if (extraTranslateY) {
                const base = transform === 'none' ? '' : `${transform} `;
                result.transform = `${base}translateY(${extraTranslateY}px)`.trim();
              }
              return result as React.CSSProperties;
            }

            let x = parseFloat(match[1]) / scale;
            let y = parseFloat(match[2]) / scale;

            if (clampXMin !== undefined) x = Math.max(x, clampXMin);
            if (clampXMax !== undefined) x = Math.min(x, clampXMax);
            if (clampYMin !== undefined) y = Math.max(y, clampYMin);
            if (clampYMax !== undefined) y = Math.min(y, clampYMax);
            y += extraTranslateY;

            const is3d = /translate3d\(/.test(transform);
            const z = match[3] ?? '0';
            result.transform = transform.replace(
              /translate(?:3d)?\(([-\d.]+)px,\s*([-\d.]+)px(?:,\s*([-\d.]+)px)?\)/,
              is3d ? `translate3d(${x}px, ${y}px, ${z}px)` : `translate(${x}px, ${y}px)`
            );
          }
        } catch {
          if (extraTranslateY) {
            const base = transform === 'none' ? '' : `${transform} `;
            result.transform = `${base}translateY(${extraTranslateY}px)`.trim();
          }
        }
      } else if (extraTranslateY) {
        result.transform = `translateY(${extraTranslateY}px)`;
      }

      return result as React.CSSProperties;
    };

    const getBlockOffsetRows = (block: CardBlock) => {
      if (isGridOffsetType(block.type)) return getNormalizedGridOffsetRows(block);
      return getNormalizedRowOffset(block);
    };

    const getRowOffsetBoundsWithinCard = (
      blockId: string,
      currentOffset: number,
      useContentTopForMin = false
    ) => {
      if (typeof document === 'undefined') {
        return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };
      }

      const rowEl = rowElMapRef.current.get(blockId) ?? null;
      if (!rowEl) return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };

      const surfaceEl = rowEl.closest('[data-card-surface="true"]') as HTMLElement | null;
      if (!surfaceEl) return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };

      const rowRect = rowEl.getBoundingClientRect();
      const surfaceRect = surfaceEl.getBoundingClientRect();
      const surfaceStyle = window.getComputedStyle(surfaceEl);
      const ruledTopOffsetPx = Math.max(0, Number.parseFloat(surfaceStyle.getPropertyValue('--ruled-offset-px')) || 0);
      const ruledBottomOffsetPx = Math.max(0, Number.parseFloat(surfaceStyle.getPropertyValue('--ruled-bottom-offset-px')) || 0);
      const rawSurfaceScaleY =
        surfaceEl.offsetHeight > 0 ? surfaceRect.height / surfaceEl.offsetHeight : 1;
      const surfaceScaleY =
        Number.isFinite(rawSurfaceScaleY) && rawSurfaceScaleY > 0 ? rawSurfaceScaleY : 1;
      const stepPx = ROW_STEP_PX * surfaceScaleY;
      const epsilon = stepPx * 0.01;

      const topLineY = surfaceRect.top + ruledTopOffsetPx * surfaceScaleY;
      const bottomLineY = surfaceRect.bottom - ruledBottomOffsetPx * surfaceScaleY;
      const minAnchorTopY = useContentTopForMin
        ? rowRect.top + currentOffset * stepPx
        : rowRect.top;
      const upRows = Math.floor((minAnchorTopY - topLineY + epsilon) / stepPx);
      const downRows = Math.floor((bottomLineY - rowRect.bottom + epsilon) / stepPx);

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
          type: 'image',
          images: [],
          audios: [],
          content: '',
          rowOffset: baseOffset,
          orderIndex: 0,
        };

        newBlocks.splice(insertIndex, 0, newBlock);
        pendingEntries.push({ id: newBlockId, file });
        insertIndex++;
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

    const handleAddBlock = (type: CardBlock['type']) => {
      // reference/audio は右上ポップアップ専用。本文ブロック追加経路では扱わない。
      if (type === 'reference' || type === 'audio') return;

      const source = blocksRef.current;

      const tailRowOffset = (() => {
        for (let i = source.length - 1; i >= 0; i -= 1) {
          const b = source[i];
          if (!isRowPositionableType(b.type) || isGridOffsetType(b.type)) continue;
          if (b.rowOffset !== undefined) return Math.round(Number(b.rowOffset ?? 0));
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
        content: '',
        images: [],
        audios: [],
        code: type === 'code' ? { language: 'javascript', code: '' } : undefined,
        math: type === 'math' ? { latex: '', displayMode: 'block' } : undefined,
        markdown: type === 'markdown' ? '' : undefined,
        rowOffset: isRowPositionableType(type) && !isGridOffsetType(type) ? tailRowOffset : undefined,
        offsetRows: isGridOffsetType(type) ? Math.max(0, tailGridOffsetRows) : undefined,
        orderIndex: 0,
      };

      const next = [...source, newBlock];
      blocksRef.current = next;
      emitChange(next, { reindex: true });
    };

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
      const next = source.filter((b) => b.id !== id);
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

    const handleShiftBlockRow = (blockId: string, direction: 'up' | 'down') => {
      const delta = direction === 'up' ? -1 : 1;
      const source = blocksRef.current;
      const currentBlock = source.find((b) => b.id === blockId);
      if (!currentBlock) return;
      if (!isRowPositionableType(currentBlock.type)) return;

      const currentOffsetRows = getBlockOffsetRows(currentBlock);
      const bounds = getRowOffsetBoundsWithinCard(
        blockId,
        currentOffsetRows,
        isGridOffsetType(currentBlock.type)
      );
      const nextOffsetRowsRaw = currentOffsetRows + delta;
      const boundedMin = isGridOffsetType(currentBlock.type) ? Math.max(0, bounds.min) : bounds.min;
      const nextOffsetRows = Math.min(Math.max(nextOffsetRowsRaw, boundedMin), bounds.max);
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

      // 候補要素を開始時にキャッシュ（毎回 querySelectorAll しない）
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
        const horizontalOverlap = movedRect.left < rect.right && movedRect.right > rect.left;
        const verticalOverlap = movedRect.top < rect.bottom && movedRect.bottom > rect.top;
        return horizontalOverlap && verticalOverlap;
      });

      if (!hasCollision) return;

      const reverted = source.map((b) => {
        if (b.id !== blockId) return b;
        if (isGridOffsetType(b.type)) {
          return { ...b, offsetRows: session.originOffsetRows, rowOffset: undefined };
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
      />
    );

    const toolbarMount = toolbarMountRef?.current ?? null;
    const inlineToolbar = toolbarNode && !toolbarMount ? (
      <div className="mb-2">{toolbarNode}</div>
    ) : null;

    return (
      <div
        ref={containerRef}
        className={cn(
          'space-y-0',
          prefix === 'question' ? 'js-question-editor' : 'js-answer-editor'
        )}
      >
        {toolbarNode && toolbarMount ? createPortal(toolbarNode, toolbarMount) : inlineToolbar}

        <Droppable droppableId={droppableId} direction="vertical" type="card-block">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-0 overflow-x-visible overflow-y-visible"
            >
              {bodyBlocks.map((block, index) => (
                <Draggable
                  key={block.id}
                  draggableId={`${droppableId}:${block.id}`}
                  index={index}
                  isDragDisabled={true}
                >
                  {(provided, snapshot) => {
                    const rowMovable = isRowPositionableType(block.type);
                    const isGridOffsetBlock = isGridOffsetType(block.type);

                    const rowOffsetRows = rowMovable ? getBlockOffsetRows(block) : 0;
                    const rowOffsetPx = rowMovable && !isGridOffsetBlock ? rowOffsetRows * ROW_STEP_PX : 0;
                    const gridOffsetPx = isGridOffsetBlock ? rowOffsetRows * ROW_STEP_PX : 0;

                    const canMoveUp = rowMovable;
                    const canMoveDown = rowMovable;

                    const dragStyle = clampDragStyle(provided.draggableProps.style, {
                      clampXMin: 0,
                      clampXMax: 0,
                      // finalY = dndY + rowOffsetPx >= 0
                      clampYMin: index === 0 ? -rowOffsetPx : undefined,
                      scale: measurement.scale,
                      extraTranslateY: rowOffsetPx,
                    }) as React.CSSProperties | undefined;

                    const isDndDisabled = true;

                    return (
                      <div
                        ref={(el) => {
                          provided.innerRef(el);
                          registerRowEl(block.id, el);
                        }}
                        {...provided.draggableProps}
                        data-block-id={block.id}
                        className="relative"
                        data-block-row="true"
                        data-row-offset-applied={rowOffsetPx ? 'true' : undefined}
                        data-active={snapshot.isDragging ? 'true' : 'false'}
                        style={dragStyle}
                      >
                        {/* DnD 並び替え用の“掴み帯”（BlockWrapperのグリップは1行移動専用） */}
                        {!isDndDisabled && (
                          <div
                            {...provided.dragHandleProps}
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-grab active:cursor-grabbing"
                            aria-label="Drag to reorder"
                            onMouseDownCapture={(e) => {
                              if (isEditableTarget(e.target)) e.stopPropagation();
                            }}
                            onTouchStartCapture={(e) => {
                              if (isEditableTarget(e.target)) e.stopPropagation();
                            }}
                          />
                        )}

                        {block.type === 'text' && (
                          <TextBlock
                            content={block.content || ''}
                            onChange={(content) => handleUpdateBlock(block.id, { content })}
                            onDelete={() => handleDeleteBlock(block.id, index)}
                            onDuplicate={() => handleDuplicateBlock(block.id)}
                            onMoveUp={() => handleShiftBlockRow(block.id, 'up')}
                            onMoveDown={() => handleShiftBlockRow(block.id, 'down')}
                            onMoveDragStart={() => handleMoveDragStart(block.id)}
                            onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                            dragHandleProps={undefined}
                            dragEnabled={true}
                            dragHandleClassName="js-block-drag-handle"
                            accentColor={accentColor}
                            isActive={snapshot.isDragging}
                            placeholder={customPlaceholders?.[index] || '文章を入力...'}
                            autoFocus={autoFocus && index === bodyBlocks.length - 1}
                          />
                        )}

                        {block.type === 'code' && (
                          <div className="w-full max-w-full overflow-visible">
                            {gridOffsetPx > 0 && (
                              <div
                                aria-hidden
                                className="pointer-events-none"
                                style={{ height: `${gridOffsetPx}px` }}
                              />
                            )}
                            <CodeBlockItem
                              data={block.code || { language: 'javascript', code: '' }}
                              onChange={(data) => handleUpdateBlock(block.id, { code: data })}
                              onDelete={() => handleDeleteBlock(block.id, index)}
                              onDuplicate={() => handleDuplicateBlock(block.id)}
                              onMoveUp={() => handleShiftBlockRow(block.id, 'up')}
                              onMoveDown={() => handleShiftBlockRow(block.id, 'down')}
                              onMoveDragStart={() => handleMoveDragStart(block.id)}
                              onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                              canMoveUp={canMoveUp}
                              canMoveDown={canMoveDown}
                              dragHandleProps={undefined}
                              dragEnabled={true}
                              dragHandleClassName="js-block-drag-handle"
                              accentColor={accentColor}
                              isActive={snapshot.isDragging}
                            />
                          </div>
                        )}

                        {block.type === 'image' && (
                          <MediaBlock
                            data={block.images || []}
                            onChange={(data) => handleUpdateBlock(block.id, { images: data })}
                            onDelete={() => handleDeleteBlock(block.id, index)}
                            onDuplicate={() => handleDuplicateBlock(block.id)}
                            dragHandleProps={undefined}
                            dragHandleClassName="js-block-drag-handle"
                            accentColor={accentColor}
                            isActive={snapshot.isDragging}
                            initialFile={pendingUploads[block.id] ?? pendingUploadsRef.current[block.id]}
                            onConsumeInitialFile={() => handleConsumeInitialFile(block.id)}
                            onFilesExcess={(files) => handleBlockOverflow(block.id, files)}
                            onMoveUp={() => handleShiftBlockRow(block.id, 'up')}
                            onMoveDown={() => handleShiftBlockRow(block.id, 'down')}
                            onMoveDragStart={() => handleMoveDragStart(block.id)}
                            onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                          />
                        )}

                        {block.type === 'math' && (
                          <div className="w-full max-w-full overflow-visible">
                            {gridOffsetPx > 0 && (
                              <div
                                aria-hidden
                                className="pointer-events-none"
                                style={{ height: `${gridOffsetPx}px` }}
                              />
                            )}
                            <MathBlock
                              data={block.math || { latex: '', displayMode: 'block' }}
                              onChange={(data) => handleUpdateBlock(block.id, { math: data })}
                              onDelete={() => handleDeleteBlock(block.id, index)}
                              onDuplicate={() => handleDuplicateBlock(block.id)}
                              dragHandleProps={undefined}
                              dragHandleClassName="js-block-drag-handle"
                              accentColor={accentColor}
                              isActive={snapshot.isDragging}
                              onMoveUp={() => handleShiftBlockRow(block.id, 'up')}
                              onMoveDown={() => handleShiftBlockRow(block.id, 'down')}
                              onMoveDragStart={() => handleMoveDragStart(block.id)}
                              onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                              canMoveUp={canMoveUp}
                              canMoveDown={canMoveDown}
                            />
                          </div>
                        )}

                        {block.type === 'markdown' && (
                          <MarkdownBlock
                            markdown={block.markdown || ''}
                            onChange={(md) => handleUpdateBlock(block.id, { markdown: md })}
                            onDelete={() => handleDeleteBlock(block.id, index)}
                            onDuplicate={() => handleDuplicateBlock(block.id)}
                            dragHandleProps={undefined}
                            dragHandleClassName="js-block-drag-handle"
                            accentColor={accentColor}
                            isActive={snapshot.isDragging}
                            onMoveUp={() => handleShiftBlockRow(block.id, 'up')}
                            onMoveDown={() => handleShiftBlockRow(block.id, 'down')}
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
                                    ...(p.type === 'code' ? { code: p.code } : {}),
                                    content: '',
                                    images: [],
                                    audios: [],
                                    offsetRows: Math.max(0, baseOffset),
                                    rowOffset: undefined,
                                    orderIndex: 0,
                                  };
                                }

                                return {
                                  id: newId,
                                  type: 'markdown' as const,
                                  markdown: p.markdown,
                                  content: '',
                                  images: [],
                                  audios: [],
                                  rowOffset: baseOffset,
                                  orderIndex: 0,
                                };
                              });

                              const source = blocksRef.current;
                              const updated = [...source];
                              updated.splice(index, 1, ...newBlocks);

                              blocksRef.current = updated;
                              emitChange(updated, { reindex: true });
                            }}
                          />
                        )}
                      </div>
                    );
                  }}
                </Draggable>
              ))}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  }
);

BlockEditor.displayName = 'BlockEditor';
