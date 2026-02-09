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
  dragHandleClassName?: string;
  accentColor?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

export const TextBlock = ({ content, onChange, onDelete, onDuplicate, dragHandleProps, dragHandleClassName, accentColor, autoFocus, placeholder }: TextBlockProps) => {
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      label="Text"
      icon={TypeIcon}
      accentColor={accentColor}
    >
      <AutoResizeTextarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "テキストを入力..."}
        minRows={1}
        autoFocus={autoFocus}
        className="font-serif text-base font-medium text-slate-700 leading-normal break-all placeholder:text-slate-300 border-none px-0 py-0.5 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none w-full max-w-2xl mx-auto"
      />
    </BlockWrapper>
  );
};
