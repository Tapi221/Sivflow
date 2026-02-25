import React from 'react';
import { MarkdownBlockContent } from './MarkdownBlockContent';

interface MarkdownBlockViewProps {
  md: string;
  align?: 'left' | 'center';
  className?: string;
}

export type MarkdownBlockPreviewProps = {
  markdown: string;
  align?: 'left' | 'center';
  className?: string;
};

export const MarkdownBlockPreview: React.FC<MarkdownBlockPreviewProps> = ({
  markdown,
  ...rest
}) => {
  return <MarkdownBlockContent markdown={markdown} {...rest} />;
};

export const MarkdownBlockView: React.FC<MarkdownBlockViewProps> = ({
  md,
  ...rest
}) => {
  return <MarkdownBlockContent markdown={md} {...rest} />;
};

