import React from 'react';
import Star from 'lucide-react/dist/esm/icons/star';
import CircleHelp from 'lucide-react/dist/esm/icons/circle-help';
import { cn } from '@/lib/utils';

interface CardCornerActionsProps {
  onHelp?: () => void;
  onStar?: () => void;
  helpActive?: boolean;
  starActive?: boolean;
  className?: string;
}

export function CardCornerActions({
  onHelp,
  onStar,
  helpActive = false,
  starActive = false,
  className,
}: CardCornerActionsProps) {
  if (!onHelp && !onStar) return null;

  const buttonBaseClass =
    'rounded-full h-7 w-7 min-h-0 min-w-0 transition-colors flex items-center justify-center border border-transparent';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {onHelp ? (
        <button
          type="button"
          aria-label="不確実フラグ"
          aria-pressed={helpActive ? 'true' : 'false'}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onHelp();
          }}
          className={cn(
            buttonBaseClass,
            helpActive
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
              : 'bg-slate-50/80 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          )}
          title="曖昧/要復習"
        >
          <CircleHelp size={12} className={cn(helpActive && 'fill-current/20')} />
        </button>
      ) : null}
      {onStar ? (
        <button
          type="button"
          aria-label="ブックマーク"
          aria-pressed={starActive ? 'true' : 'false'}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onStar();
          }}
          className={cn(
            buttonBaseClass,
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
