import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';

import { BlockToolbar } from './BlockToolbar';
import { TextBlock } from './blocks/TextBlock';
import { CodeBlockItem } from './blocks/CodeBlockItem';
import { MediaBlock } from './blocks/MediaBlock';
import { MemoBlock } from './blocks/MemoBlock';
import { ReferenceBlock } from './blocks/ReferenceBlock';
import { MathBlock } from './blocks/MathBlock';
import { MarkdownBlock } from './blocks/MarkdownBlock';

import type { CardBlock } from '@/types';
import { cn } from '@/lib/utils';
import { useUserSettings } from '@/hooks/useUserSettings';

const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
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
  canAddLink?: boolean;
  canAddAudio?: boolean;
  customPlaceholders?: Record<number, string>;
  hideToolbar?: boolean;

  emptyAddDefaultType?: CardBlock['type'];

  onDelete?: (index: number) => void;
  minDeletableIndex?: number;
  hiddenBlockTypes?: CardBlock['type'][];

  toolbarMountRef?: React.RefObject<HTMLDivElement | null>;
}

type DndStyle = React.CSSProperties & { transform?: string };
const ROW_STEP_PX = 24;

export const BlockEditor = React.forwardRef<BlockEditorHandle, BlockEditorProps>(({
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
  canAddLink = true,
  canAddAudio = true,
  customPlaceholders,
  hideToolbar = false,
  onDelete,
  minDeletableIndex = 0,
  hiddenBlockTypes = [],
  toolbarMountRef
}, ref) => {
  const { settings } = useUserSettings();
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<Record<string, File>>({});
  const blocksRef = React.useRef<CardBlock[]>(blocks);
  const moveSessionRef = React.useRef<{ blockId: string; originOffset: number } | null>(null);
  const dragHandleClassName = "js-block-drag-handle";

  React.useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  React.useImperativeHandle(ref, () => ({
    addBlock: (type: CardBlock['type']) => {
      handleAddBlock(type);
    }
  }));

  const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest('input, textarea, select, [contenteditable="true"]');
  };

  const clampDragStyle = (
    style: React.CSSProperties | undefined,
    {
      clampXMin,
      clampXMax,
      clampYMin,
      clampYMax
    }: {
      clampXMin?: number;
      clampXMax?: number;
      clampYMin?: number;
      clampYMax?: number;
    }
  ) => {
    const s = style as DndStyle | undefined;
    if (!s || !s.transform) return style;

    const match = String(s.transform).match(/translate(?:3d)?\(([-\d.]+)px,\s*([-\d.]+)px/);
    if (!match) return style;

    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);

    if (clampXMin !== undefined) x = Math.max(x, clampXMin);
    if (clampXMax !== undefined) x = Math.min(x, clampXMax);
    if (clampYMin !== undefined) y = Math.max(y, clampYMin);
    if (clampYMax !== undefined) y = Math.min(y, clampYMax);

    const transform = String(s.transform).includes('3d')
      ? `translate3d(${x}px, ${y}px, 0px)`
      : `translate(${x}px, ${y}px)`;

    return { ...style, transform };
  };

  const handleBlockOverflow = (blockId: string, files: File[]) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    const newPendingUploads = { ...pendingUploads };
    const newBlocks = [...blocks];
    let currentIndex = index + 1;

    files.forEach(file => {
      const newBlockId = `${prefix}-image-${uid()}`;
      const newBlock: CardBlock = {
        id: newBlockId,
        type: 'image',
        images: [],
        audios: [],
        content: '',
        orderIndex: currentIndex
      };

      newBlocks.splice(currentIndex, 0, newBlock);
      newPendingUploads[newBlockId] = file;
      currentIndex++;
    });

    setPendingUploads(newPendingUploads);
    onChange(newBlocks.map((b, i) => ({ ...b, orderIndex: i })));
  };

  const handleConsumeInitialFile = (blockId: string) => {
    setPendingUploads(prev => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
  };

  const handleAddBlock = (type: CardBlock['type']) => {
    if (type === 'reference' || type === 'audio') {
      const existingIndex = blocks.findIndex(b => b.type === type);
      if (existingIndex !== -1) {
        handleDeleteBlock(blocks[existingIndex].id, existingIndex);
        return;
      }
    }

    const tailRowOffset = (() => {
      for (let i = blocks.length - 1; i >= 0; i -= 1) {
        const b = blocks[i];
        if (b.type === 'text' || b.type === 'code') {
          return Math.round(Number(b.rowOffset ?? 0));
        }
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
      references: type === 'reference' ? [{ url: '', name: '' }] : undefined,
      math: type === 'math' ? { latex: '', displayMode: 'block' } : undefined,
      markdown: type === 'markdown' ? '' : undefined,
      rowOffset: (type === 'text' || type === 'code') ? tailRowOffset : undefined,
      orderIndex: blocks.length
    };
    onChange([...blocks, newBlock].map((b, i) => ({ ...b, orderIndex: i })));
  };

  const handleUpdateBlock = (id: string, updates: Partial<CardBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleDeleteBlock = (id: string, index?: number) => {
    if (onDelete && index !== undefined) {
      onDelete(index);
      return;
    }

    const next = blocks
      .filter(b => b.id !== id)
      .map((b, i) => ({ ...b, orderIndex: i }));

    onChange(next);
  };

  const handleDuplicateBlock = (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;

    const original = blocks[index];

    if (original.type === 'reference' && !canAddLink) {
      alert('リンクブロックはこのセクションに既に存在します。');
      return;
    }
    if (original.type === 'audio' && !canAddAudio) {
      alert('音声ブロックはこのセクションに既に存在します。');
      return;
    }

    if (duplicateToOpposite && onCrossDuplicate) {
      onCrossDuplicate(original);
      return;
    }

    const duplicate: CardBlock = {
      ...original,
      id: `${prefix}-${original.type}-${uid()}`,
      orderIndex: index + 1
    };

    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicate);

    const reindexed = newBlocks.map((b, i) => ({ ...b, orderIndex: i }));
    onChange(reindexed);
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next.map((item, orderIndex) => ({ ...item, orderIndex })));
  };

  const getRowOffset = (block: CardBlock) => {
    return Math.round(Number(block.rowOffset ?? 0));
  };

  const getRowOffsetBoundsWithinCard = (blockId: string, currentOffset: number) => {
    if (typeof document === 'undefined') {
      return { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };
    }

    const rowEl = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
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

  const handleShiftBlockRow = (blockId: string, direction: 'up' | 'down') => {
    const delta = direction === 'up' ? -1 : 1;
    const sourceBlocks = blocksRef.current;
    const currentBlock = sourceBlocks.find((block) => block.id === blockId);
    if (!currentBlock || (currentBlock.type !== 'text' && currentBlock.type !== 'code')) return;

    const currentOffset = getRowOffset(currentBlock);
    const nextOffsetRaw = currentOffset + delta;
    const bounds = getRowOffsetBoundsWithinCard(blockId, currentOffset);
    const nextOffset = Math.min(Math.max(nextOffsetRaw, bounds.min), bounds.max);
    if (nextOffset === currentOffset) return;

    const nextBlocks = sourceBlocks.map((block) => {
        if (block.id === blockId) {
          return {
            ...block,
            rowOffset: nextOffset,
          };
        }
        return {
          ...block,
          rowOffset: block.rowOffset,
        };
      });

    blocksRef.current = nextBlocks;
    onChange(nextBlocks);
  };

  const handleMoveDragStart = (blockId: string) => {
    const sourceBlocks = blocksRef.current;
    const currentBlock = sourceBlocks.find((block) => block.id === blockId);
    if (!currentBlock) return;
    moveSessionRef.current = {
      blockId,
      originOffset: getRowOffset(currentBlock),
    };
  };

  const handleMoveDragEnd = (blockId: string) => {
    const session = moveSessionRef.current;
    moveSessionRef.current = null;
    if (!session || session.blockId !== blockId) return;

    const sourceBlocks = blocksRef.current;
    const movedBlock = sourceBlocks.find((block) => block.id === blockId);
    if (!movedBlock || (movedBlock.type !== 'text' && movedBlock.type !== 'code')) return;

    const movedEl = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
    if (!movedEl) return;

    const movedRect = movedEl.getBoundingClientRect();
    const candidates = Array.from(document.querySelectorAll('[data-block-row="true"]')) as HTMLElement[];

    const hasCollision = candidates.some((el) => {
      if (el === movedEl) return false;
      const rect = el.getBoundingClientRect();

      const horizontalOverlap = movedRect.left < rect.right && movedRect.right > rect.left;
      const verticalOverlap = movedRect.top < rect.bottom && movedRect.bottom > rect.top;

      return horizontalOverlap && verticalOverlap;
    });

    if (!hasCollision) return;

    const revertedBlocks = sourceBlocks.map((block) =>
      block.id === blockId
        ? { ...block, rowOffset: session.originOffset }
        : block
    );

    blocksRef.current = revertedBlocks;
    onChange(revertedBlocks);
  };

  const toolbarNode = hideToolbar ? null : (
    <BlockToolbar
      label={label}
      onAddBlock={handleAddBlock}
      settings={settings}
      canAddLink={canAddLink}
      canAddAudio={canAddAudio}
      hiddenBlockTypes={hiddenBlockTypes}
    />
  );

  const toolbarMount = toolbarMountRef?.current ?? null;

  return (
  <div
    className={cn(
      "pt-4 md:pt-6 space-y-1.5 md:space-y-2",
      prefix === 'question' ? 'js-question-editor' : 'js-answer-editor'
    )}
  >

      {toolbarNode && toolbarMount ? createPortal(toolbarNode, toolbarMount) : toolbarNode}

      <Droppable droppableId={droppableId} direction="vertical" type="card-block">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-0 pr-3 overflow-x-clip overflow-y-visible">
            {blocks.map((block, index) => (
              <Draggable
                key={block.id}
                draggableId={block.id}
                index={index}
                isDragDisabled={
                  block.type === 'reference' ||
                  block.type === 'audio' ||
                  block.type === 'text' ||
                  block.type === 'code'
                }
              >
                {(provided, snapshot) => (
                  (() => {
                    const isLinePositionable = block.type === 'text' || block.type === 'code';
                    const rowOffsetPx = isLinePositionable ? getRowOffset(block) * ROW_STEP_PX : 0;
                    const dragStyle = clampDragStyle(provided.draggableProps.style, {
                      // ブロック並び替えは縦方向のみ。X軸を固定して「掴んだ瞬間に横へ逃げる」挙動を防ぐ
                      clampXMin: 0,
                      clampXMax: 0,
                      clampYMin: index === 0 ? 0 : undefined
                    }) as React.CSSProperties | undefined;
                    const baseTransform = dragStyle?.transform ? String(dragStyle.transform) : '';
                    const offsetTransform = rowOffsetPx !== 0 ? `translateY(${rowOffsetPx}px)` : '';
                    const mergedTransform = [baseTransform, offsetTransform].filter(Boolean).join(' ').trim();

                    const mergedStyle: React.CSSProperties | undefined = dragStyle
                      ? { ...dragStyle, transform: mergedTransform || dragStyle.transform }
                      : (mergedTransform ? { transform: mergedTransform } : undefined);

                    return (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    data-block-id={block.id}
                    onPointerDownCapture={() => setActiveBlockId(block.id)}
                    onPointerEnter={() => setActiveBlockId(block.id)}
                    onPointerLeave={() => setActiveBlockId((prev) => (prev === block.id ? null : prev))}
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
                    data-active={(activeBlockId === block.id || snapshot.isDragging) ? "true" : "false"}
                    style={mergedStyle}
                  >
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
                        canMoveUp={true}
                        canMoveDown={true}
                        dragHandleProps={undefined}
                        dragEnabled={true}
                        dragHandleClassName={dragHandleClassName}
                        accentColor={accentColor}
                        isActive={activeBlockId === block.id || snapshot.isDragging}
                        placeholder={customPlaceholders?.[index] || "文章を入力..."}
                        autoFocus={autoFocus && index === blocks.length - 1}
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
                        canMoveUp={true}
                        canMoveDown={true}
                        dragHandleProps={undefined}
                        dragEnabled={true}
                        dragHandleClassName={dragHandleClassName}
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
                        dragHandleProps={provided.dragHandleProps}
                        dragHandleClassName={dragHandleClassName}
                        accentColor={accentColor}
                        isActive={activeBlockId === block.id || snapshot.isDragging}
                        initialFile={pendingUploads[block.id]}
                        onConsumeInitialFile={() => handleConsumeInitialFile(block.id)}
                        onFilesExcess={(files) => handleBlockOverflow(block.id, files)}
                      />
                    )}

                    {block.type === 'audio' && (
                      <MediaBlock
                        type="audio"
                        data={block.audios || []}
                        onChange={(data) => handleUpdateBlock(block.id, { audios: data })}
                        onDelete={() => handleDeleteBlock(block.id, index)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        isActive={activeBlockId === block.id || snapshot.isDragging}
                        accentColor={accentColor}
                      />
                    )}

                    {block.type === 'memo' && (
                      <MemoBlock
                        content={block.content || ''}
                        onChange={(content) => handleUpdateBlock(block.id, { content })}
                        onDelete={() => handleDeleteBlock(block.id, index)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        dragHandleProps={provided.dragHandleProps}
                        dragHandleClassName={dragHandleClassName}
                        accentColor={accentColor}
                        isActive={activeBlockId === block.id || snapshot.isDragging}
                      />
                    )}

                    {block.type === 'reference' && (
                      <ReferenceBlock
                        references={block.references || []}
                        onChange={(references) => handleUpdateBlock(block.id, { references })}
                        onDelete={() => handleDeleteBlock(block.id, index)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        dragHandleProps={provided.dragHandleProps}
                        accentColor={accentColor}
                        isActive={activeBlockId === block.id || snapshot.isDragging}
                      />
                    )}

                    {block.type === 'math' && (
                      <MathBlock
                        data={block.math || { latex: '', displayMode: 'block' }}
                        onChange={(data) => handleUpdateBlock(block.id, { math: data })}
                        onDelete={() => handleDeleteBlock(block.id, index)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        dragHandleProps={provided.dragHandleProps}
                        dragHandleClassName={dragHandleClassName}
                        accentColor={accentColor}
                        isActive={activeBlockId === block.id || snapshot.isDragging}
                      />
                    )}

                    {block.type === 'markdown' && (
                      <MarkdownBlock
                        markdown={block.markdown || ''}
                        onChange={(md) => handleUpdateBlock(block.id, { markdown: md })}
                        onDelete={() => handleDeleteBlock(block.id, index)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        dragHandleProps={provided.dragHandleProps}
                        dragHandleClassName={dragHandleClassName}
                        accentColor={accentColor}
                        isActive={activeBlockId === block.id || snapshot.isDragging}
                        onReplaceWithBlocks={(parsed) => {
                          const newBlocks = parsed.map((p, pi) => {
                            const newId = `${prefix}-${p.type}-${uid()}`;
                            if (p.type === 'code') {
                              return {
                                id: newId, type: 'code' as const,
                                code: p.code, content: '', images: [], audios: [],
                                orderIndex: 0,
                              };
                            }
                            return {
                              id: newId, type: 'markdown' as const,
                              markdown: p.markdown, content: '', images: [], audios: [],
                              orderIndex: 0,
                            };
                          });
                          const updated = [...blocks];
                          updated.splice(index, 1, ...newBlocks);
                          onChange(updated.map((b, i) => ({ ...b, orderIndex: i })));
                        }}
                      />
                    )}
                  </div>
                    );
                  })()
                )}
              </Draggable>
            ))}

            {provided.placeholder}

            {blocks.length === 0 && (
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
});

BlockEditor.displayName = 'BlockEditor';
