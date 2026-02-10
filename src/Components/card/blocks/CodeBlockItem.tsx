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
  dragHandleClassName?: string;
  accentColor?: string;
  isActive?: boolean;
  showDelete?: boolean;
}

export const CodeBlockItem = ({ data, onChange, onDelete, onDuplicate, dragHandleProps, dragHandleClassName, accentColor, isActive, showDelete }: CodeBlockItemProps) => {
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      label="Code"
      icon={CodeIcon}
      accentColor={accentColor}
      isActive={isActive}
      showDelete={showDelete}
    >
      <CodeBlockEditor 
        value={data}
        onChange={onChange}
        className="border-none shadow-none"
      />
    </BlockWrapper>
  );
};
