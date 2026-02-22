import React from 'react';
import { StickyNote } from 'lucide-react';
import { BlockWrapper } from './BlockWrapper';
import AutoResizeTextarea from '@/Components/ui/AutoResizeTextarea';

interface MemoBlockProps {
  content: string;
  onChange: (content: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: any;
  dragHandleClassName?: string;
  accentColor?: string;
  isActive?: boolean;
  showDelete?: boolean;
}

export const MemoBlock = ({ content, onChange, onDelete, onDuplicate, dragHandleProps, dragHandleClassName, accentColor, isActive, showDelete }: MemoBlockProps) => {
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      label="Memo"
      icon={StickyNote}
      accentColor={accentColor}
      isActive={isActive}
      showDelete={showDelete}
    >
      <AutoResizeTextarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="メモを入力..."
        minRows={1}
        allowInternalScroll={false}
        className="bg-slate-50 px-3 py-1 rounded-[16px] border-none focus-visible:ring-0 text-slate-600 text-sm resize-none"
      />
    </BlockWrapper>
  );
};
