import React from "react";
import { Image as ImageIcon } from "@web-renderer/chip/icons";
import { BlockWrapper } from "@web-renderer/components/card/blocks/core/BlockWrapper";
import { cn } from "@web-renderer/lib/utils";
import { ImageBlockContent } from "./ImageBlockContent";
import { ImageBlockShell } from "./ImageBlockShell";
import type { UploadedImage } from "@/types/domain/assets";



interface MediaBlockProps {
  data: UploadedImage[];
  onChange: (data: UploadedImage[]) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: unknown;
  dragHandleClassName?: string;
  accentColor?: string;
  initialFile?: File;
  onConsumeInitialFile?: () => void;
  onFilesExcess?: (files: File[]) => void;
  isBlockSelected?: boolean;
  showDelete?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
  displayMode?: "fixed" | "fluid";
  zoom?: number;
}



const areMediaBlockPropsEqual = (
  prev: MediaBlockProps,
  next: MediaBlockProps,
) =>
  prev.data === next.data &&
  prev.dragHandleClassName === next.dragHandleClassName &&
  prev.accentColor === next.accentColor &&
  prev.initialFile === next.initialFile &&
  prev.isBlockSelected === next.isBlockSelected &&
  prev.showDelete === next.showDelete &&
  prev.canMoveUp === next.canMoveUp &&
  prev.canMoveDown === next.canMoveDown &&
  prev.displayMode === next.displayMode &&
  prev.zoom === next.zoom;



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
  isBlockSelected,
  showDelete,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
  displayMode = "fixed",
  zoom = 1,
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
      isBlockSelected={isBlockSelected}
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
      <ImageBlockShell>
        <ImageBlockContent
          mode="edit"
          urls={data}
          onChange={onChange}
          initialFile={initialFile}
          onConsumeInitialFile={onConsumeInitialFile}
          onFilesExcess={onFilesExcess}
          displayMode={displayMode}
          zoom={zoom}
        />
      </ImageBlockShell>
    </BlockWrapper>
  );
};



const MediaBlock = React.memo(MediaBlockInner, areMediaBlockPropsEqual);
MediaBlock.displayName = "MediaBlock";

export { MediaBlock };
