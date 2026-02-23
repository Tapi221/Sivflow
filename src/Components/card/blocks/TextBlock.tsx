import React from 'react';
import AutoResizeTextarea from '@/Components/ui/AutoResizeTextarea';
import TypeIcon from 'lucide-react/dist/esm/icons/type';
import { BlockWrapper } from './BlockWrapper';

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
      variant="paper"
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      dragEnabled={dragEnabled}
      dragHandleClassName={dragHandleClassName}
      className="bg-transparent border-slate-100/80 py-0"
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
      <AutoResizeTextarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "テキストを入力..."}
        minRows={1}
        lineHeight={24}
        allowInternalScroll={false}
        autoFocus={autoFocus}
        className="font-serif text-base font-medium text-slate-700 leading-[24px] break-all text-center placeholder:text-slate-300 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none w-full"
      />
    </BlockWrapper>
  );
};
