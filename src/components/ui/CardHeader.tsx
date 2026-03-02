import React from 'react';
import { cn } from '@/lib/utils';

interface CardHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ icon, title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {icon ? <span className="shrink-0 text-slate-500">{icon}</span> : null}
          <h3 className="text-base font-semibold text-slate-800 truncate">{title}</h3>
        </div>
        {description ? <p className="text-xs text-slate-500 mt-1">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

