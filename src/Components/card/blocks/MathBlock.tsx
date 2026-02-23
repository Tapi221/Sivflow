import React, { useCallback, useId, useState } from 'react';
import type { DraggableProvided } from '@hello-pangea/dnd';

import SigmaIcon from 'lucide-react/dist/esm/icons/sigma';
import AutoResizeTextarea from '@/Components/ui/AutoResizeTextarea';
import { BlockWrapper } from './BlockWrapper';
import { MathRenderer } from './MathRenderer';
import { cn } from '@/lib/utils';
import type { MathBlockData } from '@/types';

const MAX_LATEX_LENGTH = 10000;

interface MathBlockProps {
  data: MathBlockData;
  onChange: (data: MathBlockData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: Record<string, unknown> | null;
  dragHandleClassName?: string;
  accentColor?: string;
  isActive?: boolean;
  showDelete?: boolean;

  // ---- 1行移動（rowOffset）用 ----
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveDragStart?: () => void;
  onMoveDragEnd?: () => void;
}

/**
 * 数式ブロックコンポーネント
 * KaTeX入力、リアルタイムプレビュー、入力バリデーションを提供
 */
export const MathBlock: React.FC<MathBlockProps> = ({
  data,
  onChange,
  onDelete,
  onDuplicate,
  dragHandleProps,
  dragHandleClassName,
  accentColor,
  isActive,
  showDelete,

  // move props
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onMoveDragStart,
  onMoveDragEnd,
}) => {
  const [error, setError] = useState<string | null>(null);
  const textareaId = useId();
  const errorId = useId();
  const counterId = useId();

  const latex = data?.latex ?? '';
  const charCount = latex.length;

  // KaTeX入力の変更ハンドラ
  const handleLatexChange = useCallback(
    (nextLatex: string) => {
      // 文字数制限チェック（超過分は切り詰めて反映）
      if (nextLatex.length > MAX_LATEX_LENGTH) {
        const truncated = nextLatex.slice(0, MAX_LATEX_LENGTH);
        setError(`KaTeX文字列は最大 ${MAX_LATEX_LENGTH.toLocaleString()} 文字までです`);
        onChange({ ...data, latex: truncated });
        return;
      }

      if (error) setError(null);
      onChange({ ...data, latex: nextLatex });
    },
    [data, onChange, error]
  );

  return (
    <BlockWrapper
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      label="Math"
      icon={SigmaIcon}
      accentColor={accentColor}
      isActive={isActive}
      showDelete={showDelete}
      // 1行移動
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onMoveDragStart={onMoveDragStart}
      onMoveDragEnd={onMoveDragEnd}
    >
      <div className="space-y-1.5 px-2 py-0.5">
        {/* KaTeX入力エリア */}
        <div>
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <label
              htmlFor={textareaId}
              className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none"
            >
              KaTeX
            </label>
            <span
              id={counterId}
              className={cn(
                'text-[10px] tabular-nums',
                charCount >= MAX_LATEX_LENGTH
                  ? 'text-red-600 font-semibold'
                  : 'text-slate-400'
              )}
            >
              {charCount.toLocaleString()} / {MAX_LATEX_LENGTH.toLocaleString()}
            </span>
          </div>

          <AutoResizeTextarea
            id={textareaId}
            value={latex}
            onChange={(e) => handleLatexChange(e.target.value)}
            placeholder="例: x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"
            minRows={1}
            allowInternalScroll={false}
            aria-invalid={!!error}
            aria-describedby={cn(error ? errorId : '', counterId).trim() || undefined}
            className={cn(
              'font-mono text-base text-slate-700 placeholder:text-slate-300',
              'border border-slate-100 rounded-xl px-3 py-2 transition-all duration-300',
              'focus-visible:ring-2 focus-visible:ring-offset-0 bg-slate-50/50 focus:bg-white focus:border-slate-200/50',
              'shadow-inner focus:shadow-sm resize-none leading-relaxed w-full'
            )}
            style={
              {
                '--tw-ring-color': accentColor
                  ? `${accentColor}40`
                  : 'var(--primary-color-alpha-40)',
              } as React.CSSProperties
            }
          />

          {error && (
            <p id={errorId} className="text-[10px] text-red-600 mt-1 font-medium">
              {error}
            </p>
          )}
        </div>

        {/* プレビューエリア */}
        {latex.trim() && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[50px] overflow-x-auto overflow-y-hidden">
            <MathRenderer
              latex={latex}
              displayMode={data.displayMode ?? 'block'}
              className="text-slate-800"
            />
          </div>
        )}
      </div>
    </BlockWrapper>
  );
};