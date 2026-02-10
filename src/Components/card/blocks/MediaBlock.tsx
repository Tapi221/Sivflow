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
  dragHandleClassName?: string;
  accentColor?: string;
  initialFile?: File;
  onConsumeInitialFile?: () => void;
  onFilesExcess?: (files: File[]) => void;
  isActive?: boolean;
  showDelete?: boolean;
}

export const MediaBlock = ({ 
  type, 
  data, 
  onChange, 
  onDelete, 
  onDuplicate, 
  dragHandleProps, 
  dragHandleClassName,
  accentColor,
  initialFile,
  onConsumeInitialFile,
  onFilesExcess,
  isActive,
  showDelete
}: MediaBlockProps) => {
  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      label={type === 'image' ? 'Images' : 'Audio'}
      icon={type === 'image' ? ImageIcon : Volume2}
      accentColor={accentColor}
      isActive={isActive}
      showDuplicate={type !== 'audio'}
      showDragHandle={type !== 'audio'}
      showDelete={showDelete}
    >
      <MediaUploader
        type={type}
        urls={data}
        onChange={onChange}
        maxFiles={1} // Always 1 for both image and audio
        initialFile={initialFile}
        onConsumeInitialFile={onConsumeInitialFile}
        onFilesExcess={onFilesExcess}
      />
    </BlockWrapper>
  );
};
