import React from 'react';
import CodeIcon from 'lucide-react/dist/esm/icons/code';
import { BlockWrapper } from './BlockWrapper';
import { CodeBlockEditor } from '../CodeBlockEditor';
import type { CodeBlockData } from '@/types/code-block';

interface CodeBlockItemProps {
  data: CodeBlockData;
  onChange: (data: CodeBlockData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: any;
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
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      dragEnabled={dragEnabled}
      dragHandleClassName={dragHandleClassName}
      className="bg-transparent border-0 hover:border-0 shadow-none px-0 rounded-none"
      label="Code"
      icon={CodeIcon}
      accentColor={undefined}
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
