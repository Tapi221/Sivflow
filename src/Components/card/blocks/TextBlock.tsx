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
  accentColor?: string;
}

export const TextBlock = ({ content, onChange, onDelete, onDuplicate, dragHandleProps, accentColor }: TextBlockProps) => {
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      label="Text"
      icon={TypeIcon}
      accentColor={accentColor}
    >
      <AutoResizeTextarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="テキストを入力..."
        minRows={2}
        className="font-sans text-lg text-slate-700 placeholder:text-slate-300 border-none px-6 py-4 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none leading-relaxed"
      />
    </BlockWrapper>
  );
};
