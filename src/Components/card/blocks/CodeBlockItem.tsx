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
  accentColor?: string;
}

export const CodeBlockItem = ({ data, onChange, onDelete, onDuplicate, dragHandleProps, accentColor }: CodeBlockItemProps) => {
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      label="Code"
      icon={CodeIcon}
      accentColor={accentColor}
    >
      <CodeBlockEditor 
        value={data}
        onChange={onChange}
        className="border-none shadow-none"
      />
    </BlockWrapper>
  );
};
