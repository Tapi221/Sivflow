import { forwardRef } from 'react';
import type { SVGProps } from 'react';
import { StratisFrameIcon } from './StratisFrameIcon';

export type StratisMarkdownIconProps = SVGProps<SVGSVGElement>;

export const StratisMarkdownIcon = forwardRef<SVGSVGElement, StratisMarkdownIconProps>(function StratisMarkdownIcon(
  { className, ...props },
  ref
) {
  return (
    <StratisFrameIcon ref={ref} {...props} className={className}>
      <path
        d="M6.8 7.6H8.45L10.35 10.15L12.25 7.6H13.9V15.9H12.25V10.25L10.35 12.75L8.45 10.25V15.9H6.8V7.6ZM13.9 12.35H15.9V10.85H17.4V12.35H19.4L16.65 15.3L13.9 12.35Z"
        fill="currentColor"
      />
    </StratisFrameIcon>
  );
});
