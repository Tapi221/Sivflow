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
        d="M7.2 15.8V8.2L10.35 12.05L13.5 8.2V15.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
        fill="none"
      />
      <path
        d="M16.65 9.2V15.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
        fill="none"
      />
      <path
        d="M14.7 13.55L16.65 15.5L18.6 13.55"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
        fill="none"
      />
    </StratisFrameIcon>
  );
});
