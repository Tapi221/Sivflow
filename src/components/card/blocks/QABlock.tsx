import React, { useState } from "react";
import { BlockInset } from "./BlockInset";
import { BlockWrapper } from "./BlockWrapper";
import type { CardBlock } from "@/types";

interface QABlockProps {
  block: CardBlock;
  onChange: (updates: Partial<CardBlock>) => void;
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
}

export const QABlock: React.FC<QABlockProps> = ({
  block,
  onChange,
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
}) => {
  // 開閉状態はローカル state で管理（軽量・再マウント時にリセット）
  const [isOpen, setIsOpen] = useState(false);

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      dragHandleProps={dragHandleProps}
      dragEnabled={dragEnabled}
      dragHandleClassName={dragHandleClassName}
      accentColor={accentColor}
      isActive={isActive}
    >
      <BlockInset variant="question">
        <div className="w-full rounded-md border border-slate-200 bg-white overflow-hidden text-sm">
          {/* Q 行 */}
          <div className="flex items-start gap-2 px-3 py-2">
            <span className="shrink-0 font-semibold text-slate-500 leading-snug mt-0.5 text-xs">
              Q
            </span>
            <textarea
              value={block.qaQuestion ?? ""}
              onChange={(e) => onChange({ qaQuestion: e.target.value })}
              placeholder="疑問・質問を入力..."
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none border-none text-slate-800 leading-snug placeholder:text-slate-300 text-sm"
              style={{ minHeight: "1.4rem", overflowY: "hidden" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
          </div>

          {/* 区切り + トグル */}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 border-t border-slate-100 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors text-left"
          >
            <span className="text-[10px]">{isOpen ? "▼" : "▶"}</span>
            <span>{isOpen ? "A:" : "Aを見る"}</span>
          </button>

          {/* A 行（展開時） */}
          {isOpen && (
            <div className="flex items-start gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/50">
              <span className="shrink-0 font-semibold text-slate-400 leading-snug mt-0.5 text-xs">
                A
              </span>
              <textarea
                value={block.qaAnswer ?? ""}
                onChange={(e) => onChange({ qaAnswer: e.target.value })}
                placeholder="答え・メモを入力..."
                rows={2}
                className="flex-1 resize-none bg-transparent outline-none border-none text-slate-700 leading-snug placeholder:text-slate-300 text-sm"
                style={{ minHeight: "2.8rem", overflowY: "hidden" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
              />
            </div>
          )}
        </div>
      </BlockInset>
    </BlockWrapper>
  );
};
