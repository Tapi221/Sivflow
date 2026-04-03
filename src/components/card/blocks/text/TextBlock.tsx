import React from "react";
import { Type } from "@/ui/icons";
import { BlockWrapper } from "@/components/card/blocks/core/BlockWrapper";
import { TextBlockContent } from "@/components/card/blocks/text/TextBlockContent";
import { cn } from "@/lib/utils";

interface TextBlockProps {
  content: string;
  onChange: (content: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: unknown;
  dragEnabled?: boolean;
  dragHandleClassName?: string;
  accentColor?: string;
  autoFocus?: boolean;
  placeholder?: string;
  isActive?: boolean;
  showDelete?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
}

const TextBlockInner = ({
  content,
  onChange,
  onDelete,
  onDuplicate,
  dragHandleProps,
  dragEnabled = true,
  dragHandleClassName,
  accentColor,
  autoFocus,
  placeholder,
  isActive,
  showDelete,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
}: TextBlockProps) => {
  const isContentEmpty =
    content.replace(/[\u200B-\u200D\uFEFF]/g, "").trim().length === 0;

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      dragEnabled={dragEnabled}
      dragHandleClassName={dragHandleClassName}
      className={cn("bg-transparent px-0 py-0", !isContentEmpty && "border-0")}
      contentClassName="px-0"
      label="Text"
      icon={Type}
      accentColor={accentColor}
      isActive={isActive}
      showDelete={showDelete}
      canMoveUp={!!canMoveUp}
      canMoveDown={!!canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
    >
      <TextBlockContent
        mode="edit"
        content={content}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </BlockWrapper>
  );
};

const areTextBlockPropsEqual = (prev: TextBlockProps, next: TextBlockProps) =>
  prev.content === next.content &&
  prev.dragEnabled === next.dragEnabled &&
  prev.dragHandleClassName === next.dragHandleClassName &&
  prev.accentColor === next.accentColor &&
  prev.autoFocus === next.autoFocus &&
  prev.placeholder === next.placeholder &&
  prev.isActive === next.isActive &&
  prev.showDelete === next.showDelete &&
  prev.canMoveUp === next.canMoveUp &&
  prev.canMoveDown === next.canMoveDown;

export const TextBlock = React.memo(TextBlockInner, areTextBlockPropsEqual);
TextBlock.displayName = "TextBlock";






