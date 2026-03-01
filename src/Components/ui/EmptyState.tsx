import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('h-full w-full flex items-center justify-center', className)}>
      <div className="text-center space-y-3 max-w-sm">
        {icon ? <div className="flex justify-center text-slate-400">{icon}</div> : null}
        <div>
          <p className="text-sm font-semibold text-slate-700">{title}</p>
          {description ? <p className="text-xs text-slate-500 mt-1">{description}</p> : null}
        </div>
        {action ? <div className="flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

