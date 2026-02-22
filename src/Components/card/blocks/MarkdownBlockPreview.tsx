import React from 'react';
import { cn } from '@/lib/utils';
import { MarkdownBlockView } from './MarkdownBlockView';

interface MarkdownBlockPreviewProps {
  markdown: string;
  className?: string;
}

export const MarkdownBlockPreview: React.FC<MarkdownBlockPreviewProps> = ({
  markdown,
  className,
}) => {
  if (!markdown.trim()) {
    return (
      <div className={cn('text-slate-300 text-base font-medium leading-[24px]', className)}>
        Markdownを入力...
      </div>
    );
  }

  return <MarkdownBlockView md={markdown} className={cn('markdownBlockPreview', className)} />;
};
