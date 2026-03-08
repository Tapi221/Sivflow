import React from "react";
import { Type } from "@/ui/icons";
import { BlockWrapper } from "./BlockWrapper";
import { TextBlockContent } from "./TextBlockContent";
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

export const TextBlock = ({
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



