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
        d="M7.4 8.4H8.5L10.2 10.6L11.9 8.4H13V14.3H11.9V10.2L10.2 12.3L8.5 10.2V14.3H7.4V8.4ZM14.2 12.4H15.7V11.3H16.8V12.4H18.3L16.25 14.55L14.2 12.4Z"
        fill="currentColor"
      />
    </StratisFrameIcon>
  );
});
