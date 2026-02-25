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
import { Plus } from 'lucide-react';

import { BlockToolbar } from './BlockToolbar';
import { TextBlock } from './blocks/TextBlock';
import { CodeBlockItem } from './blocks/CodeBlockItem';
import { MediaBlock } from './blocks/MediaBlock';
import { MathBlock } from './blocks/MathBlock';
import { MarkdownBlock } from './blocks/MarkdownBlock';

import type { CardBlock } from '@/types';
import { cn } from '@/lib/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { CARD_ROW_PX, CARD_TOP_PADDING_PX } from './constants';

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

  emptyAddDefaultType?: CardBlock['type'];

  onDelete?: (index: number) => void;
  minDeletableIndex?: number;
  hiddenBlockTypes?: CardBlock['type'][];

  toolbarMountRef?: React.RefObject<HTMLDivElement | null>;
}

type DndStyle = React.CSSProperties & { transform?: string };
const ROW_STEP_PX = CARD_ROW_PX;

const isRowPositionableType = (type: CardBlock['type']) =>
  type === 'text' ||
  type === 'code' ||
  type === 'image' ||
  type === 'math' ||
  type === 'markdown';

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest('input, textarea, select, [contenteditable="true"]');
};

// scroll/resize を rAF で間引く（大規模で必須）
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
      color,
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
    const nonBodyBlocks = useMemo(
      () => blocks.filter((b) => b.type === 'reference' || b.type === 'audio'),
      [blocks]
    );
    const bodyBlocks = useMemo(
      () => blocks.filter((b) => b.type !== 'reference' && b.type !== 'audio'),
      [blocks]
    );

    // このエディタが責任を持つのは bodyBlocks のみ。emit 時に nonBody を末尾へ保持する。
    const emitChange = useCallback(
      (nextBodyBlocks: CardBlock[]) => {
        const normalized = [...nextBodyBlocks, ...nonBodyBlocks].map((b, i) => ({
          ...b,
          orderIndex: i,
        }));
        onChange(normalized);
      },
      [nonBodyBlocks, onChange]
    );

    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [pendingUploads, setPendingUploads] = useState<Record<string, File>>({});

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
      originOffset: number;
      candidates: HTMLElement[];
    } | null>(null);

    // コンテナのスケールと座標計測用
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [measurement, setMeasurement] = useState({ scale: 1, top: 0, left: 0 });

    const updateMeasurement = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const scale = rect.width / el.offsetWidth;

      const nextMeasurement = {
        scale: scale > 0 ? scale : 1,
        top: rect.top,
        left: rect.left,
      };

      // 同値ならsetState抑止
      setMeasurement((prev) =>
        prev.scale === nextMeasurement.scale &&
        prev.top === nextMeasurement.top &&
        prev.left === nextMeasurement.left
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
      // capture で全スクロール拾うのは重いけど、座標追従が要るなら rAF 間引きで妥協
      window.addEventListener('scroll', scheduleMeasurement, { passive: true, capture: true });

      return () => {
        obs.disconnect();
        window.removeEventListener('resize', scheduleMeasurement as any);
        window.removeEventListener('scroll', scheduleMeasurement as any, true);
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
        containerTop = 0,
        containerLeft = 0,
      }: {
        clampXMin?: number;
        clampXMax?: number;
        clampYMin?: number;
        clampYMax?: number;
        scale?: number;
        containerTop?: number;
        containerLeft?: number;
      }
    ) => {
      const s = style as DndStyle | any;
      if (!s) return style;

      const result: any = { ...style };

      // transform 補正 (translate)
      if (s.transform) {
        const match = String(s.transform).match(
          /translate(?:3d)?\(([-\d.]+)px,\s*([-\d.]+)px/
        );
        if (match) {
          let x = parseFloat(match[1]) / scale;
          let y = parseFloat(match[2]) / scale;

          if (clampXMin !== undefined) x = Math.max(x, clampXMin);
          if (clampXMax !== undefined) x = Math.min(x, clampXMax);
          if (clampYMin !== undefined) y = Math.max(y, clampYMin);
          if (clampYMax !== undefined) y = Math.min(y, clampYMax);

          result.transform = String(s.transform).includes('3d')
            ? `translate3d(${x}px, ${y}px, 0px)`
            : `translate(${x}px, ${y}px)`;
        }
      }

      // top / left 補正 (dnd が付与する fixed 座標)
      if (s.top !== undefined) {
        const rawTop = typeof s.top === 'number' ? s.top : parseFloat(String(s.top));
        result.top = (rawTop - containerTop) / scale;
      }
      if (s.left !== undefined) {
        const rawLeft = typeof s.left === 'number' ? s.left : parseFloat(String(s.left));
        result.left = (rawLeft - containerLeft) / scale;
      }

      return result as React.CSSProperties;
    };

    const getRowOffset = (block: CardBlock) => Math.round(Number(block.rowOffset ?? 0));

    const getRowOffsetBoundsWithinCard = (blockId: string, currentOffset: number) => {
      if (typeof document === 'undefined') {
        return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };
      }

      const rowEl = rowElMapRef.current.get(blockId) ?? null;
      if (!rowEl) return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };

      const bodyEl = rowEl.closest('.card-shell-body') as HTMLElement | null;
      if (!bodyEl) return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };

      const rowRect = rowEl.getBoundingClientRect();
      const bodyRect = bodyEl.getBoundingClientRect();
      const upRows = Math.floor((rowRect.top - bodyRect.top) / ROW_STEP_PX);
      const downRows = Math.floor((bodyRect.bottom - rowRect.bottom) / ROW_STEP_PX);

      return {
        min: currentOffset - Math.max(0, upRows),
        max: currentOffset + Math.max(0, downRows),
      };
    };

    const handleBlockOverflow = (blockId: string, files: File[]) => {
      const source = blocksRef.current;
      const index = source.findIndex((b) => b.id === blockId);
      if (index === -1) return;

      const baseOffset = getRowOffset(source[index]);

      const newPendingUploads = { ...pendingUploads };
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
        newPendingUploads[newBlockId] = file;
        insertIndex++;
      }

      setPendingUploads(newPendingUploads);
      blocksRef.current = newBlocks;
      emitChange(newBlocks);
    };

    const handleConsumeInitialFile = (blockId: string) => {
      setPendingUploads((prev) => {
        const next = { ...prev };
        delete next[blockId];
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
          if (b.rowOffset !== undefined) return Math.round(Number(b.rowOffset ?? 0));
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
        rowOffset: isRowPositionableType(type) ? tailRowOffset : undefined,
        orderIndex: 0,
      };

      const next = [...source, newBlock];
      blocksRef.current = next;
      emitChange(next);
    };

    const handleUpdateBlock = (id: string, updates: Partial<CardBlock>) => {
      const source = blocksRef.current;
      const next = source.map((b) => (b.id === id ? { ...b, ...updates } : b));
      blocksRef.current = next;
      emitChange(next);
    };

    const handleDeleteBlock = (id: string, index?: number) => {
      if (onDelete && index !== undefined) {
        onDelete(index);
        return;
      }

      const source = blocksRef.current;
      const next = source.filter((b) => b.id !== id);
      blocksRef.current = next;
      emitChange(next);
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
      emitChange(next);
    };

    const handleShiftBlockRow = (blockId: string, direction: 'up' | 'down') => {
      const delta = direction === 'up' ? -1 : 1;
      const source = blocksRef.current;
      const currentBlock = source.find((b) => b.id === blockId);
      if (!currentBlock) return;
      if (!isRowPositionableType(currentBlock.type)) return;

      const currentOffset = getRowOffset(currentBlock);
      const bounds = getRowOffsetBoundsWithinCard(blockId, currentOffset);
      const nextOffsetRaw = currentOffset + delta;
      const nextOffset = Math.min(Math.max(nextOffsetRaw, bounds.min), bounds.max);
      if (nextOffset === currentOffset) return;

      const next = source.map((b) => (b.id === blockId ? { ...b, rowOffset: nextOffset } : b));
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
        originOffset: getRowOffset(currentBlock),
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

      const reverted = source.map((b) =>
        b.id === blockId ? { ...b, rowOffset: session.originOffset } : b
      );
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

    return (
      <div
        ref={containerRef}
        className={cn(
          'space-y-1.5 md:space-y-2',
          prefix === 'question' ? 'js-question-editor' : 'js-answer-editor'
        )}
        style={{ paddingTop: CARD_TOP_PADDING_PX }}
      >
        {toolbarNode && toolbarMount ? createPortal(toolbarNode, toolbarMount) : toolbarNode}

        <Droppable droppableId={droppableId} direction="vertical" type="card-block">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-0 pr-3 overflow-x-clip overflow-y-visible"
            >
              {bodyBlocks.map((block, index) => (
                <Draggable
                  key={block.id}
                  draggableId={block.id}
                  index={index}
                  // 並び替え禁止はやめていいけど、現状仕様を尊重
                  isDragDisabled={block.type === 'text' || block.type === 'code'}
                >
                  {(provided, snapshot) => {
                    const rowMovable = isRowPositionableType(block.type);

                    const rowOffsetPx = rowMovable ? getRowOffset(block) * ROW_STEP_PX : 0;

                    const currentOffset = rowMovable ? getRowOffset(block) : 0;
                    const bounds = rowMovable
                      ? getRowOffsetBoundsWithinCard(block.id, currentOffset)
                      : { min: 0, max: 0 };
                    const canMoveUp = rowMovable ? currentOffset > bounds.min : false;
                    const canMoveDown = rowMovable ? currentOffset < bounds.max : false;

                    const dragStyle = clampDragStyle(provided.draggableProps.style, {
                      clampXMin: 0,
                      clampXMax: 0,
                      clampYMin: index === 0 ? 0 : undefined,
                      scale: measurement.scale,
                      containerTop: measurement.top,
                      containerLeft: measurement.left,
                    }) as React.CSSProperties | undefined;

                    const baseTransform = dragStyle?.transform ? String(dragStyle.transform) : '';
                    const offsetTransform = rowOffsetPx !== 0 ? `translateY(${rowOffsetPx}px)` : '';
                    const mergedTransform = [baseTransform, offsetTransform]
                      .filter(Boolean)
                      .join(' ')
                      .trim();

                    const mergedStyle: React.CSSProperties | undefined = dragStyle
                      ? { ...dragStyle, transform: mergedTransform || dragStyle.transform }
                      : mergedTransform
                      ? { transform: mergedTransform }
                      : undefined;

                    const isDndDisabled = block.type === 'text' || block.type === 'code';

                    return (
                      <div
                        ref={(el) => {
                          provided.innerRef(el);
                          registerRowEl(block.id, el);
                        }}
                        {...provided.draggableProps}
                        data-block-id={block.id}
                        onPointerDownCapture={() => setActiveBlockId(block.id)}
                        onPointerEnter={() => setActiveBlockId(block.id)}
                        onPointerLeave={() =>
                          setActiveBlockId((prev) => (prev === block.id ? null : prev))
                        }
                        onFocusCapture={(e) => {
                          setActiveBlockId(block.id);
                          if (isEditableTarget(e.target)) setEditingBlockId(block.id);
                        }}
                        onBlurCapture={(e) => {
                          const next = e.relatedTarget as Node | null;
                          if (!next || !e.currentTarget.contains(next)) {
                            setActiveBlockId((prev) => (prev === block.id ? null : prev));
                            setEditingBlockId((prev) => (prev === block.id ? null : prev));
                          }
                        }}
                        className="relative"
                        data-block-row="true"
                        data-active={activeBlockId === block.id || snapshot.isDragging ? 'true' : 'false'}
                        style={mergedStyle}
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
                            isActive={activeBlockId === block.id || snapshot.isDragging}
                            placeholder={customPlaceholders?.[index] || '文章を入力...'}
                            autoFocus={autoFocus && index === bodyBlocks.length - 1}
                          />
                        )}

                        {block.type === 'code' && (
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
                            isActive={activeBlockId === block.id || snapshot.isDragging}
                          />
                        )}

                        {block.type === 'image' && (
                          <MediaBlock
                            type="image"
                            data={block.images || []}
                            onChange={(data) => handleUpdateBlock(block.id, { images: data })}
                            onDelete={() => handleDeleteBlock(block.id, index)}
                            onDuplicate={() => handleDuplicateBlock(block.id)}
                            dragHandleProps={undefined}
                            dragHandleClassName="js-block-drag-handle"
                            accentColor={accentColor}
                            isActive={activeBlockId === block.id || snapshot.isDragging}
                            initialFile={pendingUploads[block.id]}
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
                          <MathBlock
                            data={block.math || { latex: '', displayMode: 'block' }}
                            onChange={(data) => handleUpdateBlock(block.id, { math: data })}
                            onDelete={() => handleDeleteBlock(block.id, index)}
                            onDuplicate={() => handleDuplicateBlock(block.id)}
                            dragHandleProps={undefined}
                            dragHandleClassName="js-block-drag-handle"
                            accentColor={accentColor}
                            isActive={activeBlockId === block.id || snapshot.isDragging}
                            onMoveUp={() => handleShiftBlockRow(block.id, 'up')}
                            onMoveDown={() => handleShiftBlockRow(block.id, 'down')}
                            onMoveDragStart={() => handleMoveDragStart(block.id)}
                            onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                          />
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
                            isActive={activeBlockId === block.id || snapshot.isDragging}
                            onMoveUp={() => handleShiftBlockRow(block.id, 'up')}
                            onMoveDown={() => handleShiftBlockRow(block.id, 'down')}
                            onMoveDragStart={() => handleMoveDragStart(block.id)}
                            onMoveDragEnd={() => handleMoveDragEnd(block.id)}
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                            onReplaceWithBlocks={(parsed) => {
                              const baseOffset = getRowOffset(block);

                              const newBlocks = parsed.map((p) => {
                                const newId = `${prefix}-${p.type}-${uid()}`;

                                if (p.type === 'code') {
                                  return {
                                    id: newId,
                                    type: 'code' as const,
                                    code: p.code,
                                    content: '',
                                    images: [],
                                    audios: [],
                                    rowOffset: baseOffset,
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
                              emitChange(updated);
                            }}
                          />
                        )}
                      </div>
                    );
                  }}
                </Draggable>
              ))}

              {provided.placeholder}

              {bodyBlocks.length === 0 && (
                <div className="flex min-h-[112px] flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-slate-100 bg-slate-50/30 px-4 py-4 text-center">
                  <Plus className="h-8 w-8 text-slate-200" />
                  <p className="m-0 mt-2 text-xs font-bold leading-tight text-slate-300 tracking-widest">
                    ブロックを追加してください
                  </p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    );
  }
);

BlockEditor.displayName = 'BlockEditor';
