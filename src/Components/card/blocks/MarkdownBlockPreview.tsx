import React from 'react';
import { cn } from '@/lib/utils';
import { MarkdownBlockContent } from './MarkdownBlockContent';

interface MarkdownBlockViewProps {
  md: string;
  align?: 'left' | 'center';
  className?: string;
  bleedX?: boolean;
}

export type MarkdownBlockPreviewProps = {
  markdown: string;
  align?: 'left' | 'center';
  className?: string;
  bleedX?: boolean;
};

interface MarkdownBlockDisplayProps extends MarkdownBlockPreviewProps {
  contentClassName?: string;
}

export const MarkdownBlockDisplay: React.FC<MarkdownBlockDisplayProps> = ({
  markdown,
  align,
  className,
  contentClassName,
  bleedX,
}) => {
  return (
    <div className="markdownBlockSurface w-full max-w-full bg-transparent overflow-visible">
      <div className={cn('w-full max-w-full px-0 py-0', contentClassName)}>
        <MarkdownBlockContent markdown={markdown} align={align} className={className} bleedX={bleedX} />
      </div>
    </div>
  );
};

export const MarkdownBlockPreview: React.FC<MarkdownBlockPreviewProps> = ({
  markdown,
  ...rest
}) => {
  return <MarkdownBlockDisplay markdown={markdown} {...rest} />;
};

export const MarkdownBlockView: React.FC<MarkdownBlockViewProps> = ({
  md,
  ...rest
}) => {
  return <MarkdownBlockDisplay markdown={md} {...rest} />;
};
