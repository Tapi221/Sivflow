import React, { useCallback, useState } from 'react';

import { Sigma } from '@/ui/icons';
import { BlockWrapper } from './BlockWrapper';
import { MathBlockContent } from './MathBlockContent';
import { MathEditorDialog } from './MathEditorDialog';
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const latex = data?.latex ?? '';

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
      className={cn(latex.trim().length > 0 && 'border-transparent')}
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      label="Math"
      icon={Sigma}
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
        <div
          className={cn(
            'cursor-text rounded-lg p-2 transition-colors',
            'hover:bg-slate-50'
          )}
          role="button"
          tabIndex={0}
          aria-label="数式を編集"
          onClick={() => setIsEditorOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            setIsEditorOpen(true);
          }}
        >
          <MathBlockContent
            latex={latex}
            displayMode={data.displayMode ?? 'block'}
            showPlaceholder
            placeholder="数式を入力..."
          />
        </div>

        <div className="px-1">
          <span
            className={cn(
              'text-[10px] tabular-nums',
              latex.length >= MAX_LATEX_LENGTH
                ? 'text-red-600 font-semibold'
                : 'text-slate-400'
            )}
          >
            {latex.length.toLocaleString()} / {MAX_LATEX_LENGTH.toLocaleString()}
          </span>
        </div>

        <MathEditorDialog
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          data={data}
          onChange={(next) => handleLatexChange(next.latex)}
          accentColor={accentColor}
          error={error}
        />
      </div>
    </BlockWrapper>
  );
};

