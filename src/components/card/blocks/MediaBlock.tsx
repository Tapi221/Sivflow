import React from "react";
import { Image as ImageIcon } from "@/ui/icons";
import { BlockWrapper } from "./BlockWrapper";
import { ImageBlockContent } from "./ImageBlockContent";
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
  const isMediaEmpty = data.length === 0 && !initialFile;

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      className={cn("px-0", !isMediaEmpty && "border-transparent")}
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
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-[11px] border border-slate-200/80"
          style={{ borderWidth: "var(--card-ruled-line-px, 1px)" }}
        />
      </div>
    </BlockWrapper>
  );
};
