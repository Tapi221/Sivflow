import React from "react";
import { Image as ImageIcon } from "@/ui/icons";
import { BlockWrapper } from "@/components/card/blocks/core/BlockWrapper";
import { ImageBlockContent } from "@/components/card/blocks/image/ImageBlockContent";
import { ImageBlockShell } from "@/components/card/blocks/image/ImageBlockShell";
import { cn } from "@/lib/utils";

interface MediaBlockProps {
  data: unknown[];
  onChange: (data: unknown[]) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: unknown;
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

const MediaBlockInner = ({
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
  const isMediaEmpty = data.length === 0 && !initialFile;

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      className={cn("py-0 px-0", !isMediaEmpty && "border-transparent")}
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
      <ImageBlockShell showBorderOverlay>
        <ImageBlockContent
          mode="edit"
          urls={data}
          onChange={onChange}
          initialFile={initialFile}
          onConsumeInitialFile={onConsumeInitialFile}
          onFilesExcess={onFilesExcess}
        />
      </ImageBlockShell>
    </BlockWrapper>
  );
};

const areMediaBlockPropsEqual = (
  prev: MediaBlockProps,
  next: MediaBlockProps,
) =>
  prev.data === next.data &&
  prev.dragHandleClassName === next.dragHandleClassName &&
  prev.accentColor === next.accentColor &&
  prev.initialFile === next.initialFile &&
  prev.isActive === next.isActive &&
  prev.showDelete === next.showDelete &&
  prev.canMoveUp === next.canMoveUp &&
  prev.canMoveDown === next.canMoveDown;

export const MediaBlock = React.memo(MediaBlockInner, areMediaBlockPropsEqual);
MediaBlock.displayName = "MediaBlock";
