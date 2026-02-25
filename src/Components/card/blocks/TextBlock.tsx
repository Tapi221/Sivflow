import React from 'react';
import TypeIcon from 'lucide-react/dist/esm/icons/type';
import { BlockWrapper } from './BlockWrapper';
import { TextBlockContent } from './TextBlockContent';

interface TextBlockProps {
  content: string;
  onChange: (content: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: any;
  dragEnabled?: boolean;
  dragHandleClassName?: string;
  accentColor?: string;
  autoFocus?: boolean;
  placeholder?: string;
  isActive?: boolean;
  showDelete?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
}

export const TextBlock = ({ content, onChange, onDelete, onDuplicate, dragHandleProps, dragEnabled = true, dragHandleClassName, accentColor, autoFocus, placeholder, isActive, showDelete, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onMoveDragStart, onMoveDragEnd }: TextBlockProps) => {
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      dragEnabled={dragEnabled}
      dragHandleClassName={dragHandleClassName}
      className="bg-transparent border-0 px-0 py-0"
      contentClassName="px-0"
      label="Text"
      icon={TypeIcon}
      accentColor={accentColor}
      isActive={isActive}
      showDelete={showDelete}
      canMoveUp={!!canMoveUp}
      canMoveDown={!!canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
    >
      <TextBlockContent
        mode="edit"
        content={content}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </BlockWrapper>
  );
};
