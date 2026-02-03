import React from 'react';
import { Image as ImageIcon, Volume2 } from 'lucide-react';
import { BlockWrapper } from './BlockWrapper';
import MediaUploader from '../MediaUploader';

interface MediaBlockProps {
  type: 'image' | 'audio';
  data: any[];
  onChange: (data: any[]) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: any;
  accentColor?: string;
}

export const MediaBlock = ({ type, data, onChange, onDelete, onDuplicate, dragHandleProps, accentColor }: MediaBlockProps) => {
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      label={type === 'image' ? 'Images' : 'Audio'}
      icon={type === 'image' ? ImageIcon : Volume2}
      accentColor={accentColor}
    >
      <MediaUploader
        type={type}
        urls={data}
        onChange={onChange}
      />
    </BlockWrapper>
  );
};
