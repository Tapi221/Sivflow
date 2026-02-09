import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus,
  Volume2,
  StickyNote,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import TypeIcon from 'lucide-react/dist/esm/icons/type';
import CodeIcon from 'lucide-react/dist/esm/icons/code';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import SigmaIcon from 'lucide-react/dist/esm/icons/sigma';

import { Button } from '@/Components/ui/button';
import { nanoid } from 'nanoid';
import { TextBlock } from './blocks/TextBlock';
import { CodeBlockItem } from './blocks/CodeBlockItem';
import { MediaBlock } from './blocks/MediaBlock';
import { MemoBlock } from './blocks/MemoBlock';
import { ReferenceBlock } from './blocks/ReferenceBlock';
import { MathBlock } from './blocks/MathBlock';
import type { CardBlock, BlockConfig } from '@/types';
import { cn } from '@/lib/utils';
import { useUserSettings } from '@/hooks/useUserSettings';

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
  onDelete?: (index: number) => void;
}

export const BlockEditor = ({
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
  onDelete
}: BlockEditorProps) => {
  const { settings } = useUserSettings();
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<Record<string, File>>({});
  const dragHandleClassName = "js-block-drag-handle";

  const handleBlockOverflow = (blockId: string, files: File[]) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    const newPendingUploads = { ...pendingUploads };
    const newBlocks = [...blocks];
    let currentIndex = index + 1;

    files.forEach(file => {
      const newBlockId = `${prefix}-image-${nanoid()}`;
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

    const newBlock: CardBlock = {
      id: `${prefix}-${type}-${nanoid()}`,
      type,
      content: '',
      images: [],
      audios: [],
      code: type === 'code' ? { language: 'javascript', code: '' } : undefined,
      references: type === 'reference' ? [{ url: '', name: '' }] : undefined,
      math: type === 'math' ? { latex: '', displayMode: 'block' } : undefined,
      orderIndex: blocks.length
    };

    let insertIndex = blocks.length;

    if (type === 'audio') {
      const referenceIndex = blocks.findIndex(b => b.type === 'reference');
      if (referenceIndex !== -1) {
        insertIndex = referenceIndex;
      }
    } else if (type === 'reference') {
      insertIndex = blocks.length;
    } else {
      const audioIndex = blocks.findIndex(b => b.type === 'audio');
      if (audioIndex !== -1) {
        insertIndex = audioIndex;
      } else {
        const referenceIndex = blocks.findIndex(b => b.type === 'reference');
        if (referenceIndex !== -1) {
          insertIndex = referenceIndex;
        }
      }
    }

    const newBlocks = [...blocks];
    newBlocks.splice(insertIndex, 0, newBlock);

    onChange(newBlocks.map((b, i) => ({ ...b, orderIndex: i })));
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
      id: `${prefix}-${original.type}-${nanoid()}`,
      orderIndex: index + 1
    };

    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicate);

    const reindexed = newBlocks.map((b, i) => ({ ...b, orderIndex: i }));
    onChange(reindexed);
  };

  const Icon = prefix === 'question' ? HelpCircle : Sparkles;

  return (
    <div className={cn("space-y-1.5 md:space-y-2", prefix === 'question' ? 'js-question-editor' : 'js-answer-editor')}>
      {/* Header & Add Block Toolbar */}
      {!hideToolbar && (
        <div className="flex flex-row items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] md:text-[10px] font-bold text-slate-300 uppercase tracking-widest block">
              {label}
            </span>
          </div>

          <div className="flex flex-nowrap items-center gap-1.5 md:gap-2 bg-slate-100/50 p-1.5 md:p-2 rounded-2xl md:rounded-full shadow-inner backdrop-blur-sm max-w-full w-fit overflow-x-auto no-scrollbar select-none">
            {(() => {
              const blockSettings = settings?.editorBlockSettings || [
                { id: 'text', type: 'text', label: 'テキスト', isVisible: true, orderIndex: 0 },
                { id: 'code', type: 'code', label: 'コード', isVisible: true, orderIndex: 1 },
                { id: 'image', type: 'image', label: '画像', isVisible: true, orderIndex: 2 },
                { id: 'audio', type: 'audio', label: '音声', isVisible: true, orderIndex: 3 },
                { id: 'reference', type: 'reference', label: 'リンク', isVisible: true, orderIndex: 4 },
                { id: 'math', type: 'math', label: '数式', isVisible: true, orderIndex: 5 },
              ];

              const sorted = [...blockSettings].sort((a, b) => a.orderIndex - b.orderIndex);
              const showLabel = settings?.blockButtonShowLabel ?? true;

              return sorted.filter(b => b.isVisible).map((config) => {
                const type = config.type;

                const getButtonClass = (specificClasses: string) =>
                  cn(
                    "flex items-center justify-center gap-1.5 md:gap-2 rounded-full font-bold transition-all duration-300 active:scale-95 text-[10px] md:text-[11px] flex-shrink-0 h-7 md:h-8 backdrop-blur-md border border-white/40",
                    specificClasses,
                    showLabel
                      ? "w-7 md:w-auto lg:w-7 xl:w-auto px-0 md:px-3 lg:px-0 xl:px-3"
                      : "w-7 md:w-8 px-0"
                  );

                const labelClass = showLabel ? "uppercase tracking-wider hidden md:inline lg:hidden xl:inline" : "hidden";

                switch (type) {
                  case 'text':
                    return (
                      <Button
                        key="add-text"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddBlock('text')}
                        className={getButtonClass("text-slate-500 hover:text-primary-600 bg-gradient-to-br from-blue-50/80 to-white/80 shadow-sm hover:shadow-lg hover:shadow-primary-500/20 hover:-translate-y-0.5")}
                      >
                        <TypeIcon className="w-3.5 h-3.5 md:w-4 h-4" />
                        <span className={labelClass}>{config.label}</span>
                      </Button>
                    );
                  case 'code':
                    return (
                      <Button
                        key="add-code"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddBlock('code')}
                        className={getButtonClass("text-slate-500 hover:text-indigo-600 bg-gradient-to-br from-indigo-50/80 to-white/80 shadow-sm hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5")}
                      >
                        <CodeIcon className="w-3.5 h-3.5 md:w-4 h-4" />
                        <span className={labelClass}>{config.label}</span>
                      </Button>
                    );
                  case 'image':
                    return (
                      <Button
                        key="add-image"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddBlock('image')}
                        className={getButtonClass("text-slate-500 hover:text-emerald-600 bg-gradient-to-br from-emerald-50/80 to-white/80 shadow-sm hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5")}
                      >
                        <ImageIcon className="w-3.5 h-3.5 md:w-4 h-4" />
                        <span className={labelClass}>{config.label}</span>
                      </Button>
                    );
                  case 'audio':
                    const isAudioHere = blocks.some(b => b.type === 'audio');
                    return (
                      <Button
                        key="add-audio"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddBlock('audio')}
                        disabled={!canAddAudio && !isAudioHere}
                        className={cn(
                          getButtonClass(""),
                          isAudioHere
                            ? "text-amber-600 bg-gradient-to-br from-amber-100/90 to-white/90 shadow-md shadow-amber-500/20"
                            : "text-slate-500 hover:text-amber-600 bg-gradient-to-br from-amber-50/80 to-white/80 shadow-sm hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-0.5",
                          (!canAddAudio && !isAudioHere) && "opacity-40 cursor-not-allowed grayscale shadow-none"
                        )}
                      >
                        <Volume2 className="w-3.5 h-3.5 md:w-4 h-4" />
                        <span className={labelClass}>{config.label}</span>
                      </Button>
                    );
                  case 'reference':
                    const isLinkHere = blocks.some(b => b.type === 'reference');
                    return (
                      <Button
                        key="add-reference"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddBlock('reference')}
                        disabled={!canAddLink && !isLinkHere}
                        className={cn(
                          getButtonClass(""),
                          isLinkHere
                            ? "text-cyan-600 bg-gradient-to-br from-cyan-100/90 to-white/90 shadow-md shadow-cyan-500/20"
                            : "text-slate-500 hover:text-cyan-600 bg-gradient-to-br from-cyan-50/80 to-white/80 shadow-sm hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5",
                          (!canAddLink && !isLinkHere) && "opacity-40 cursor-not-allowed grayscale shadow-none"
                        )}
                      >
                        <LinkIcon className="w-3.5 h-3.5 md:w-4 h-4" />
                        <span className={labelClass}>{config.label}</span>
                      </Button>
                    );
                  case 'math':
                    return (
                      <Button
                        key="add-math"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddBlock('math')}
                        className={getButtonClass("text-slate-500 hover:text-purple-600 bg-gradient-to-br from-purple-50/80 to-white/80 shadow-sm hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5")}
                      >
                        <SigmaIcon className="w-3.5 h-3.5 md:w-4 h-4" />
                        <span className={labelClass}>{config.label}</span>
                      </Button>
                    );
                  default:
                    return null;
                }
              });
            })()}
          </div>
        </div>
      )}

      {/* Blocks List */}
      <Droppable droppableId={droppableId}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3"
          >
            {blocks.map((block, index) => (
              <Draggable
                key={block.id}
                draggableId={block.id}
                index={index}
                isDragDisabled={block.type === 'reference' || block.type === 'audio'}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}

                    // ✅ “触った時だけ”アクティブにする（hoverで反応しない）
                    onPointerDownCapture={() => setActiveBlockId(block.id)}
                    onFocusCapture={() => setActiveBlockId(block.id)}

                    // ✅ フォーカスが外へ出たら解除（入力中は維持）
                    onBlurCapture={(e) => {
                      const next = e.relatedTarget as Node | null;
                      if (!next || !e.currentTarget.contains(next)) {
                        setActiveBlockId(prev => (prev === block.id ? null : prev));
                      }
                    }}

                    className="relative"
                    data-block-row="true"
                    data-active={(activeBlockId === block.id || snapshot.isDragging) ? "true" : "false"}
                  >
                    <div>
                      {block.type === 'text' && (
                        <TextBlock
                          content={block.content || ''}
                          onChange={(val) => handleUpdateBlock(block.id, { content: val })}
                          onDelete={() => handleDeleteBlock(block.id, index)}
                          onDuplicate={() => handleDuplicateBlock(block.id)}
                          dragHandleProps={provided.dragHandleProps}
                          dragHandleClassName={dragHandleClassName}
                          accentColor={accentColor}
                          autoFocus={autoFocus && index === 0}
                          placeholder={customPlaceholders?.[index]}
                        />
                      )}

                      {block.type === 'code' && (
                        <CodeBlockItem
                          data={block.code || { language: 'javascript', code: '' }}
                          onChange={(val) => handleUpdateBlock(block.id, { code: val })}
                          onDelete={() => handleDeleteBlock(block.id, index)}
                          onDuplicate={() => handleDuplicateBlock(block.id)}
                          dragHandleProps={provided.dragHandleProps}
                          dragHandleClassName={dragHandleClassName}
                          accentColor={accentColor}
                        />
                      )}
                      {block.type === 'image' && (
                        <MediaBlock
                          type="image"
                          data={block.images || []}
                          onChange={(val) => handleUpdateBlock(block.id, { images: val })}
                          onDelete={() => handleDeleteBlock(block.id, index)}
                          onDuplicate={() => handleDuplicateBlock(block.id)}
                          dragHandleProps={provided.dragHandleProps}
                          dragHandleClassName={dragHandleClassName}
                          accentColor={accentColor}
                          initialFile={pendingUploads[block.id]}
                          onConsumeInitialFile={() => handleConsumeInitialFile(block.id)}
                          onFilesExcess={(files) => handleBlockOverflow(block.id, files)}
                        />
                      )}
                      {block.type === 'audio' && (
                        <MediaBlock
                          type="audio"
                          data={block.audios || []}
                          onChange={(val) => handleUpdateBlock(block.id, { audios: val })}
                          onDelete={() => handleDeleteBlock(block.id, index)}
                          onDuplicate={() => handleDuplicateBlock(block.id)}
                          dragHandleProps={undefined}
                          accentColor={accentColor}
                        />
                      )}
                      {block.type === 'memo' && (
                        <MemoBlock
                          content={block.content || ''}
                          onChange={(val) => handleUpdateBlock(block.id, { content: val })}
                          onDelete={() => handleDeleteBlock(block.id, index)}
                          onDuplicate={() => handleDuplicateBlock(block.id)}
                          dragHandleProps={provided.dragHandleProps}
                          dragHandleClassName={dragHandleClassName}
                          accentColor={accentColor}
                        />
                      )}
                      {block.type === 'reference' && (
                        <ReferenceBlock
                          references={block.references || []}
                          onChange={(val) => handleUpdateBlock(block.id, { references: val })}
                          onDelete={() => handleDeleteBlock(block.id, index)}
                          onDuplicate={() => handleDuplicateBlock(block.id)}
                          dragHandleProps={undefined}
                          accentColor={accentColor}
                        />
                      )}
                      {block.type === 'math' && (
                        <MathBlock
                          data={block.math || { latex: '', displayMode: 'block' }}
                          onChange={(val) => handleUpdateBlock(block.id, { math: val })}
                          onDelete={() => handleDeleteBlock(block.id, index)}
                          onDuplicate={() => handleDuplicateBlock(block.id)}
                          dragHandleProps={provided.dragHandleProps}
                          dragHandleClassName={dragHandleClassName}
                          accentColor={accentColor}
                        />
                      )}
                    </div>

                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {blocks.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[40px] bg-slate-50/30">
                <Plus className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  ブロックを追加してください
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};
