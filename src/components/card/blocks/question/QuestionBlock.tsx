import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import type { CardBlock } from "@/types/domain/card";
import { HelpCircle } from "@/ui/icons";
import React, { useCallback, useRef } from "react";
import { BlockWrapper } from "./BlockWrapper";
import { QuestionBlockLayout } from "./QuestionBlockLayout";
import {
    QUESTION_BLOCK_ANSWER_TEXT_CLASS,
    QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX,
    QUESTION_BLOCK_TITLE_TEXT_CLASS,
} from "./questionBlockTextStyles";

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
  isActive?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

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
  isActive,
  onFocus,
  onBlur,
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
      isActive={isActive}
      canMoveUp={!!canMoveUp}
      canMoveDown={!!canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
      className="bg-transparent px-0 py-0"
      contentClassName="px-0"
    >
      <QuestionBlockLayout
        containerRef={containerRef}
        containerProps={{
          onFocus: handleContainerFocus,
          onBlur: handleContainerBlur,
          "data-block-type": "question",
          "data-block-id": block.id,
        }}
        questionContent={
          <AutoResizeTextarea
            value={block.questionTitle ?? ""}
            onChange={(e) =>
              onUpdateBlock(block.id, { questionTitle: e.target.value })
            }
            placeholder="疑問・質問を入力..."
            minRows={1}
            lineHeight={QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX}
            allowInternalScroll={false}
            className="flex-1"
            textareaClassName={`${QUESTION_BLOCK_TITLE_TEXT_CLASS} placeholder:text-slate-400 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full resize-none p-0`}
          />
        }
        answerContent={
          <AutoResizeTextarea
            value={block.questionAnswer ?? ""}
            onChange={(e) =>
              onUpdateBlock(block.id, { questionAnswer: e.target.value })
            }
            placeholder="答え・メモを入力..."
            minRows={1}
            lineHeight={QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX}
            allowInternalScroll={false}
            className="flex-1"
            textareaClassName={`${QUESTION_BLOCK_ANSWER_TEXT_CLASS} placeholder:text-slate-400 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full resize-none p-0`}
          />
        }
      />
    </BlockWrapper>
  );
};

const areQuestionBlockPropsEqual = (
  prev: QuestionBlockProps,
  next: QuestionBlockProps,
) =>
  prev.block === next.block &&
  prev.dragEnabled === next.dragEnabled &&
  prev.dragHandleClassName === next.dragHandleClassName &&
  prev.accentColor === next.accentColor &&
  prev.isActive === next.isActive &&
  prev.canMoveUp === next.canMoveUp &&
  prev.canMoveDown === next.canMoveDown;

export const QuestionBlock = React.memo(
  QuestionBlockInner,
  areQuestionBlockPropsEqual,
);
QuestionBlock.displayName = "QuestionBlock";

