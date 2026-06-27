import React from "react";
import { NotebookPen } from "@web-renderer/chip/icons";
import { BlockWrapper } from "@web-renderer/components/card/blocks/core/BlockWrapper";
import { cn } from "@web-renderer/lib/utils";
import type { MarkdownReplaceBlock, MarkdownReplaceFocus } from "./MarkdownBlockContent";
import { MarkdownBlockContent } from "./MarkdownBlockContent";



interface MarkdownBlockProps {
  markdown: string;
  onChange: (markdown: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: unknown;
  dragHandleClassName?: string;
  accentColor?: string;
  isBlockSelected?: boolean;
  showDelete?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
  onReplaceWithBlocks?: (
    blocks: MarkdownReplaceBlock[],
    focus?: MarkdownReplaceFocus,
  ) => void;
  zoom?: number;
}



const areMarkdownBlockPropsEqual = (
  prev: MarkdownBlockProps,
  next: MarkdownBlockProps,
) =>
  prev.markdown === next.markdown &&
  prev.dragHandleClassName === next.dragHandleClassName &&
  prev.accentColor === next.accentColor &&
  prev.isBlockSelected === next.isBlockSelected &&
  prev.showDelete === next.showDelete &&
  prev.canMoveUp === next.canMoveUp &&
  prev.canMoveDown === next.canMoveDown &&
  prev.zoom === next.zoom;



const MarkdownBlockInner: React.FC<MarkdownBlockProps> = ({
  markdown,
  onChange,
  onDelete,
  onDuplicate,
  dragHandleProps,
  dragHandleClassName,
  accentColor,
  isBlockSelected,
  showDelete,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
  onReplaceWithBlocks,
  zoom,
}) => {
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const isMarkdownEmpty = markdown.trim().length === 0;
  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      className={cn("bg-transparent px-0 py-0", !isMarkdownEmpty && "border-0")}
      contentClassName="px-0"
      label="Markdown"
      icon={NotebookPen}
      accentColor={accentColor}
      isBlockSelected={Boolean(isBlockSelected || isEditorOpen)}
      showDelete={showDelete}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
    >
      <MarkdownBlockContent
        mode="edit"
        markdown={markdown}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onChange={onChange}
        onReplaceWithBlocks={onReplaceWithBlocks}
        accentColor={accentColor}
        zoom={zoom}
      />
    </BlockWrapper>
  );
};



const MarkdownBlock = React.memo(
  MarkdownBlockInner,
  areMarkdownBlockPropsEqual,
);
MarkdownBlock.displayName = "MarkdownBlock";

export { MarkdownBlock };
