import React, { useCallback, useRef } from "react";
import { HelpCircle } from "@web-renderer/chip/icons";
import { BlockWrapper } from "@web-renderer/components/card/blocks/core/BlockWrapper";
import { QuestionBlockContent } from "./QuestionBlockContent";
import type { CardBlock } from "@/types/domain/card";



interface QuestionBlockProps {
  block: CardBlock;
  onUpdateBlock: (id: string, updates: Partial<CardBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  dragHandleProps?: unknown;
  dragEnabled?: boolean;
  dragHandleClassName?: string;
  accentColor?: string;
  isBlockSelected?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  zoom?: number;
}



const areQuestionBlockPropsEqual = (
  prev: QuestionBlockProps,
  next: QuestionBlockProps,
) =>
  prev.block === next.block &&
  prev.dragEnabled === next.dragEnabled &&
  prev.dragHandleClassName === next.dragHandleClassName &&
  prev.accentColor === next.accentColor &&
  prev.isBlockSelected === next.isBlockSelected &&
  prev.canMoveUp === next.canMoveUp &&
  prev.canMoveDown === next.canMoveDown &&
  prev.zoom === next.zoom;



const QuestionBlockInner: React.FC<QuestionBlockProps> = ({
  block,
  onUpdateBlock,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
  canMoveUp,
  canMoveDown,
  dragHandleProps,
  dragEnabled = true,
  dragHandleClassName,
  accentColor,
  isBlockSelected,
  onFocus,
  onBlur,
  zoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleContainerBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.relatedTarget as Node | null)
      ) {
        onBlur?.();
      }
    },
    [onBlur],
  );

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      dragEnabled={dragEnabled}
      dragHandleClassName={dragHandleClassName}
      icon={HelpCircle}
      accentColor={accentColor}
      isBlockSelected={isBlockSelected}
      canMoveUp={!!canMoveUp}
      canMoveDown={!!canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
      className="bg-transparent px-0 py-0"
      contentClassName="px-0"
    >
      <QuestionBlockContent
        mode="edit"
        blockId={block.id}
        questionTitle={block.questionTitle}
        questionAnswer={block.questionAnswer}
        onChangeQuestionTitle={(value) =>
          onUpdateBlock(block.id, { questionTitle: value })
        }
        onChangeQuestionAnswer={(value) =>
          onUpdateBlock(block.id, { questionAnswer: value })
        }
        containerRef={containerRef}
        onContainerFocus={handleContainerFocus}
        onContainerBlur={handleContainerBlur}
        zoom={zoom}
      />
    </BlockWrapper>
  );
};



const QuestionBlock = React.memo(
  QuestionBlockInner,
  areQuestionBlockPropsEqual,
);
QuestionBlock.displayName = "QuestionBlock";

export { QuestionBlock };
