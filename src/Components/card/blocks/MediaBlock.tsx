import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { BlockWrapper } from './BlockWrapper';
import { ImageBlockContent } from './ImageBlockContent';

interface MediaBlockProps {
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
      className="px-0 border-transparent"
      contentClassName="px-0"
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
      <div className="relative rounded-[11px] overflow-hidden">
        <ImageBlockContent
          mode="edit"
          urls={data}
          onChange={onChange}
          initialFile={initialFile}
          onConsumeInitialFile={onConsumeInitialFile}
          onFilesExcess={onFilesExcess}
        />
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[11px] border border-slate-200/80" />
      </div>
    </BlockWrapper>
  );
};
