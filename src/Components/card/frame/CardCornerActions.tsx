import React, { useCallback } from 'react';
import Star from 'lucide-react/dist/esm/icons/star';
import CircleHelp from 'lucide-react/dist/esm/icons/circle-help';
import { cn } from '@/lib/utils';

interface CardCornerActionsProps {
  onHelp?: () => void;
  onStar?: () => void;
  helpActive?: boolean;
  starActive?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CardCornerActions({
  onHelp,
  onStar,
  helpActive = false,
  starActive = false,
  disabled = false,
  className,
}: CardCornerActionsProps) {
  if (!onHelp && !onStar) return null;

  const stop = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  const buttonBaseClass =
    'rounded-full h-7 w-7 min-h-0 min-w-0 transition-colors flex items-center justify-center border border-transparent ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  const disabledClass = disabled ? 'opacity-50 pointer-events-none' : '';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {onHelp ? (
        <button
          type="button"
          aria-label="不確実フラグ"
          aria-pressed={helpActive}
          disabled={disabled}
          onPointerDown={stop}
          onMouseDown={stop}
          onKeyDown={stop}
          onClick={(e) => {
            e.stopPropagation();
            onHelp();
          }}
          className={cn(
            buttonBaseClass,
            disabledClass,
            helpActive
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
              : 'bg-slate-50/80 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          )}
          title="曖昧/要復習"
        >
          <CircleHelp size={12} className={cn(helpActive && 'opacity-90')} />
        </button>
      ) : null}

      {onStar ? (
        <button
          type="button"
          aria-label="ブックマーク"
          aria-pressed={starActive}
          disabled={disabled}
          onPointerDown={stop}
          onMouseDown={stop}
          onKeyDown={stop}
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className={cn(
            buttonBaseClass,
            disabledClass,
            starActive
              ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              : 'bg-slate-50/80 text-slate-400 hover:bg-primary-600/10 hover:text-primary-600'
          )}
          title="ブックマーク"
        >
          <Star size={12} className={cn(starActive && 'fill-current')} />
        </button>
      ) : null}
    </div>
  );
}