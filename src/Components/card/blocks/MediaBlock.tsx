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
  const enableRowMove = type !== 'audio'; // audio は “いらん” 扱いで移動させない

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
      // 1行移動（imageのみ有効）
      canMoveUp={enableRowMove ? canMoveUp : false}
      canMoveDown={enableRowMove ? canMoveDown : false}
      onMoveUp={enableRowMove ? onMoveUp : undefined}
      onMoveDown={enableRowMove ? onMoveDown : undefined}
      onMoveDragStart={enableRowMove ? onMoveDragStart : undefined}
      onMoveDragEnd={enableRowMove ? onMoveDragEnd : undefined}
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