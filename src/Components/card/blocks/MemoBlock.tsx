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
  accentColor?: string;
}

export const MemoBlock = ({ content, onChange, onDelete, onDuplicate, dragHandleProps, accentColor }: MemoBlockProps) => {
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      label="Memo"
      icon={StickyNote}
      accentColor={accentColor}
    >
      <AutoResizeTextarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="メモを入力..."
        minRows={2}
        className="bg-slate-50 p-6 rounded-[20px] border-none focus-visible:ring-0 text-slate-600 text-sm resize-none"
      />
    </BlockWrapper>
  );
};
