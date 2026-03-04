import React from 'react';
import { cn } from '@/lib/utils';

interface ExplorerRowContentProps {
  left?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  contentClassName?: string;
}

export const ExplorerRowContent: React.FC<ExplorerRowContentProps> = ({
  left,
  title,
  subtitle,
  right,
  titleClassName,
  subtitleClassName,
  contentClassName,
}) => (
  <>
    {left}
    <div className={cn('flex-1 min-w-0', contentClassName)}>
      {title ? <div className={cn('text-sm text-slate-700 truncate leading-5', titleClassName)}>{title}</div> : null}
      {subtitle ? <div className={cn('text-[10px] text-slate-400 truncate', subtitleClassName)}>{subtitle}</div> : null}
    </div>
    {right}
  </>
);
