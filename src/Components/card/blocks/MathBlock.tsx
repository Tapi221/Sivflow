import React, { useState } from 'react';

import SigmaIcon from 'lucide-react/dist/esm/icons/sigma';
import AutoResizeTextarea from '@/Components/ui/AutoResizeTextarea';
import { BlockWrapper } from './BlockWrapper';
import { MathRenderer } from './MathRenderer';
import { cn } from '@/lib/utils';
import type { MathBlockData } from '@/types';

interface MathBlockProps {
  data: MathBlockData;
  onChange: (data: MathBlockData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: any;
  dragHandleClassName?: string;
  accentColor?: string;
}

/**
 * 数式ブロックコンポーネント
 * KaTeX入力、リアルタイムプレビュー、エラーハンドリングを提供
 */
export const MathBlock: React.FC<MathBlockProps> = ({ 
  data, 
  onChange, 
  onDelete, 
  onDuplicate, 
  dragHandleProps,
  dragHandleClassName,
  accentColor 
}) => {
  const [error, setError] = useState<string | null>(null);

  // KaTeX入力の変更ハンドラ
  const handleLatexChange = (latex: string) => {
    // 文字数制限チェック
    const MAX_LATEX_LENGTH = 10000;
    if (latex.length > MAX_LATEX_LENGTH) {
      setError('KaTeX文字列が長すぎます（最大10,000文字）');
      return;
    }

    setError(null);
    onChange({ ...data, latex });
  };

  return (
    <BlockWrapper 
      onDelete={onDelete} 
      onDuplicate={onDuplicate} 
      dragHandleProps={dragHandleProps}
      dragHandleClassName={dragHandleClassName}
      label="Math"
      icon={SigmaIcon}
      accentColor={accentColor}
    >
      <div className="space-y-1.5 px-2 py-0.5">
        {/* KaTeX入力エリア */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 select-none">
            KaTeX
          </label>
          <AutoResizeTextarea
            value={data?.latex || ''}
            onChange={(e) => handleLatexChange(e.target.value)}
            placeholder="例: x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
            minRows={1}
            className={cn(
              "font-mono text-base text-slate-700 placeholder:text-slate-300",
              "border border-slate-100 rounded-xl px-3 py-2 transition-all duration-300",
              "focus-visible:ring-2 focus-visible:ring-offset-0 bg-slate-50/50 focus:bg-white focus:border-slate-200/50",
              "shadow-inner focus:shadow-sm resize-none leading-relaxed w-full"
            )}
            style={{
              '--tw-ring-color': accentColor ? `${accentColor}40` : 'var(--primary-color-alpha-40)',
            } as React.CSSProperties}
          />
          {error && (
            <p className="text-[10px] text-red-600 mt-1 font-medium">
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* プレビューエリア */}
        {(data?.latex || '').trim() && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[50px] overflow-hidden">
            <MathRenderer 
              latex={data.latex} 
              displayMode={data.displayMode || 'block'}
              className="text-slate-800"
            />
          </div>
        )}
      </div>
    </BlockWrapper>
  );
};
