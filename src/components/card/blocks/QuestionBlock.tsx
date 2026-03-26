import React, { useCallback, useRef } from "react";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { BlockWrapper } from "./BlockWrapper";
import { HelpCircle } from "@/ui/icons";
import { TEXT_BLOCK_LINE_HEIGHT_PX } from "./textBlockStyles";
import type { CardBlock } from "@/types";

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

export const QuestionBlock: React.FC<QuestionBlockProps> = ({
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
      <div
        ref={containerRef}
        onFocus={handleContainerFocus}
        onBlur={handleContainerBlur}
        className="rounded-r-md border-l-2 border-amber-400 bg-amber-50 pl-3 pr-2 py-2"
        data-block-type="question"
        data-block-id={block.id}
      >
        {/* Q 行 */}
        <div className="flex items-start gap-1.5 mb-2">
          <span className="shrink-0 text-[11px] font-bold text-amber-500 leading-none mt-[3px]">Q.</span>
          <AutoResizeTextarea
            value={block.questionTitle ?? ""}
            onChange={(e) =>
              onUpdateBlock(block.id, { questionTitle: e.target.value })
            }
            placeholder="疑問・質問を入力..."
            minRows={1}
            lineHeight={TEXT_BLOCK_LINE_HEIGHT_PX}
            allowInternalScroll={false}
            className="flex-1"
            textareaClassName="text-sm font-medium text-slate-700 leading-snug placeholder:text-slate-400 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full resize-none p-0"
          />
        </div>

        {/* A 行（編集時は常に表示） */}
        <div className="flex items-start gap-1.5 border-t border-amber-200/60 pt-1.5">
          <span className="shrink-0 text-[11px] font-bold text-slate-400 leading-none mt-[3px]">A.</span>
          <AutoResizeTextarea
            value={block.questionAnswer ?? ""}
            onChange={(e) =>
              onUpdateBlock(block.id, { questionAnswer: e.target.value })
            }
            placeholder="答え・メモを入力..."
            minRows={2}
            lineHeight={TEXT_BLOCK_LINE_HEIGHT_PX}
            allowInternalScroll={false}
            className="flex-1"
            textareaClassName="text-sm text-slate-600 leading-snug placeholder:text-slate-400 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full resize-none p-0"
          />
        </div>
      </div>
    </BlockWrapper>
  );
};
