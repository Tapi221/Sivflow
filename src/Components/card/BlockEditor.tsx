import React from 'react';
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

import { Button } from '@/Components/ui/button';
import { nanoid } from 'nanoid';
import { TextBlock } from './blocks/TextBlock';
import { CodeBlockItem } from './blocks/CodeBlockItem';
import { MediaBlock } from './blocks/MediaBlock';
import { MemoBlock } from './blocks/MemoBlock';
import type { CardBlock } from '@/types';
import { cn } from '@/lib/utils';

interface BlockEditorProps {
  blocks: CardBlock[];
  onChange: (blocks: CardBlock[]) => void;
  prefix: 'question' | 'answer';
  label: string;
  color: string;
  droppableId: string;
  accentColor?: string;
  duplicateToOpposite?: boolean; // New prop
  onCrossDuplicate?: (block: CardBlock) => void; // New prop
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
    onCrossDuplicate 
}: BlockEditorProps) => { // Updated props
  
  const handleAddBlock = (type: CardBlock['type']) => {
    const newBlock: CardBlock = {
      id: `${prefix}-${type}-${nanoid()}`,
      type,
      content: '',
      images: [],
      audios: [],
      code: type === 'code' ? { language: 'javascript', code: '' } : undefined,
      orderIndex: blocks.length
    };
    onChange([...blocks, newBlock]);
  };

  const handleUpdateBlock = (id: string, updates: Partial<CardBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleDeleteBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const handleDuplicateBlock = (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    
    const original = blocks[index];

    // Cross Duplication Logic
    if (duplicateToOpposite && onCrossDuplicate) {
        onCrossDuplicate(original);
        return;
    }

    // Standard Duplication Logic
    const duplicate: CardBlock = {
      ...original,
      id: `${prefix}-${original.type}-${nanoid()}`,
      orderIndex: index + 1
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicate);
    
    // re-index
    const reindexed = newBlocks.map((b, i) => ({ ...b, orderIndex: i }));
    onChange(reindexed);
  };

  const Icon = prefix === 'question' ? HelpCircle : Sparkles;

  return (
    <div className="space-y-6">
      {/* Header & Add Block Toolbar Integrated */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100/50 p-1.5 rounded-full border border-slate-200/50 shadow-inner backdrop-blur-sm">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleAddBlock('text')}
            className="flex items-center gap-2 rounded-full bg-white shadow-sm border border-slate-200/60 text-slate-500 hover:text-primary-600 hover:bg-white hover:shadow-md hover:scale-[1.02] h-9 px-4 font-bold transition-all active:scale-95 text-[11px]"
          >
            <TypeIcon className="w-4 h-4" />
            <span className="uppercase tracking-wider">テキスト</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleAddBlock('code')}
            className="flex items-center gap-2 rounded-full bg-white shadow-sm border border-slate-200/60 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-md hover:scale-[1.02] h-9 px-4 font-bold transition-all active:scale-95 text-[11px]"
          >
            <CodeIcon className="w-4 h-4" />
            <span className="uppercase tracking-wider">コード</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleAddBlock('image')}
            className="flex items-center gap-2 rounded-full bg-white shadow-sm border border-slate-200/60 text-slate-500 hover:text-emerald-600 hover:bg-white hover:shadow-md hover:scale-[1.02] h-9 px-4 font-bold transition-all active:scale-95 text-[11px]"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="uppercase tracking-wider">画像</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleAddBlock('audio')}
            className="flex items-center gap-2 rounded-full bg-white shadow-sm border border-slate-200/60 text-slate-500 hover:text-amber-600 hover:bg-white hover:shadow-md hover:scale-[1.02] h-9 px-4 font-bold transition-all active:scale-95 text-[11px]"
          >
            <Volume2 className="w-4 h-4" />
            <span className="uppercase tracking-wider">音声</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleAddBlock('memo')}
            className="flex items-center gap-2 rounded-full bg-white shadow-sm border border-slate-200/60 text-slate-500 hover:text-slate-800 hover:bg-white hover:shadow-md hover:scale-[1.02] h-9 px-4 font-bold transition-all active:scale-95 text-[11px]"
          >
            <StickyNote className="w-4 h-4" />
            <span className="uppercase tracking-wider">メモ</span>
          </Button>
        </div>
      </div>

      {/* Blocks List */}
      <Droppable droppableId={droppableId}>
        {(provided) => (
          <div 
            {...provided.droppableProps} 
            ref={provided.innerRef}
            className="space-y-4"
          >
            {blocks.map((block, index) => (
              <Draggable key={block.id} draggableId={block.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    {block.type === 'text' && (
                      <TextBlock 
                        content={block.content || ''}
                        onChange={(val) => handleUpdateBlock(block.id, { content: val })}
                        onDelete={() => handleDeleteBlock(block.id)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        dragHandleProps={provided.dragHandleProps}
                        accentColor={accentColor}
                      />
                    )}
                    {block.type === 'code' && (
                      <CodeBlockItem 
                        data={block.code || { language: 'javascript', code: '' }}
                        onChange={(val) => handleUpdateBlock(block.id, { code: val })}
                        onDelete={() => handleDeleteBlock(block.id)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        dragHandleProps={provided.dragHandleProps}
                        accentColor={accentColor}
                      />
                    )}
                    {block.type === 'image' && (
                      <MediaBlock 
                        type="image"
                        data={block.images || []}
                        onChange={(val) => handleUpdateBlock(block.id, { images: val })}
                        onDelete={() => handleDeleteBlock(block.id)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        dragHandleProps={provided.dragHandleProps}
                        accentColor={accentColor}
                      />
                    )}
                    {block.type === 'audio' && (
                      <MediaBlock 
                        type="audio"
                        data={block.audios || []}
                        onChange={(val) => handleUpdateBlock(block.id, { audios: val })}
                        onDelete={() => handleDeleteBlock(block.id)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        dragHandleProps={provided.dragHandleProps}
                        accentColor={accentColor}
                      />
                    )}
                    {block.type === 'memo' && (
                      <MemoBlock 
                        content={block.content || ''}
                        onChange={(val) => handleUpdateBlock(block.id, { content: val })}
                        onDelete={() => handleDeleteBlock(block.id)}
                        onDuplicate={() => handleDuplicateBlock(block.id)}
                        dragHandleProps={provided.dragHandleProps}
                        accentColor={accentColor}
                      />
                    )}
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
