import React from "react";
import { Code } from "@web-renderer/chip/icons";
import { BlockWrapper } from "@web-renderer/components/card/blocks/core/BlockWrapper";
import { cn } from "@web-renderer/lib/utils";
import { CodeBlockEditor } from "./CodeBlockEditor";
import type { CodeBlockData } from "@/types/core/code-block";



interface CodeBlockItemProps {
  data: CodeBlockData;
  onChange: (data: CodeBlockData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: unknown;
  dragEnabled?: boolean;
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
  zoom?: number;
}



const areCodeBlockItemPropsEqual = (
  prev: CodeBlockItemProps,
  next: CodeBlockItemProps,
) =>
  prev.data === next.data &&
  prev.dragEnabled === next.dragEnabled &&
  prev.dragHandleClassName === next.dragHandleClassName &&
  prev.accentColor === next.accentColor &&
  prev.isBlockSelected === next.isBlockSelected &&
  prev.showDelete === next.showDelete &&
  prev.canMoveUp === next.canMoveUp &&
  prev.canMoveDown === next.canMoveDown &&
  prev.zoom === next.zoom;



const CodeBlockItemInner = ({
  data,
  onChange,
  onDelete,
  onDuplicate,
  dragHandleProps,
  dragEnabled = true,
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
  zoom,
}: CodeBlockItemProps) => {
  const isCodeEmpty = (data?.code ?? "").trim().length === 0;

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      dragEnabled={dragEnabled}
      dragHandleClassName={dragHandleClassName}
      className={cn("bg-transparent px-0 py-0", !isCodeEmpty && "border-0")}
      label="Code"
      icon={Code}
      accentColor={accentColor}
      isBlockSelected={isBlockSelected}
      showDelete={showDelete}
      canMoveUp={!!canMoveUp}
      canMoveDown={!!canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
      contentClassName="relative px-0"
    >
      <CodeBlockEditor
        value={data}
        onChange={onChange}
        className="border-none shadow-none"
        zoom={zoom}
      />
    </BlockWrapper>
  );
};



const CodeBlockItem = React.memo(
  CodeBlockItemInner,
  areCodeBlockItemPropsEqual,
);
CodeBlockItem.displayName = "CodeBlockItem";

export { CodeBlockItem };
