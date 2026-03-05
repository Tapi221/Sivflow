import React from 'react';
import { Code } from '@/ui/icons';
import { BlockWrapper } from './BlockWrapper';
import { CodeBlockEditor } from './CodeBlockEditor';
import type { CodeBlockData } from '@/types/code-block';
import { cn } from '@/lib/utils';

interface CodeBlockItemProps {
  data: CodeBlockData;
  onChange: (data: CodeBlockData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: unknown;
  dragEnabled?: boolean;
  dragHandleClassName?: string;
  accentColor?: string;
  isActive?: boolean;
  showDelete?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
}

export const CodeBlockItem = ({ data, onChange, onDelete, onDuplicate, dragHandleProps, dragEnabled = true, dragHandleClassName, accentColor, isActive, showDelete, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onMoveDragStart, onMoveDragEnd }: CodeBlockItemProps) => {
  const isCodeEmpty = (data?.code ?? '').trim().length === 0;

  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      dragEnabled={dragEnabled}
      dragHandleClassName={dragHandleClassName}
      className={cn('bg-transparent px-0 py-0', !isCodeEmpty && 'border-0')}
      label="Code"
      icon={Code}
      accentColor={accentColor}
      isActive={isActive}
      showDelete={showDelete}
      canMoveUp={!!canMoveUp}
      canMoveDown={!!canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
      contentClassName="relative px-0"
    >
      <CodeBlockEditor 
        value={data}
        onChange={onChange}
        className="border-none shadow-none"
      />
    </BlockWrapper>
  );
};

