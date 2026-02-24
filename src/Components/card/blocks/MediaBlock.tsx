import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { BlockWrapper } from './BlockWrapper';
import MediaUploader from '../MediaUploader';

interface MediaBlockProps {
  type: 'image';
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

  // ---- 1行移動（rowOffset）用：BlockEditor から渡す ----
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
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
  showDelete,

  // move props
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
}: MediaBlockProps) => {
  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      label="Images"
      icon={ImageIcon}
      accentColor={accentColor}
      isActive={isActive}
      showDuplicate
      showDragHandle
      showDelete={showDelete}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
    >
      <MediaUploader
        type={type}
        urls={data}
        onChange={onChange}
        maxFiles={1}
        initialFile={initialFile}
        onConsumeInitialFile={onConsumeInitialFile}
        onFilesExcess={onFilesExcess}
      />
    </BlockWrapper>
  );
};
