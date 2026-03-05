import { forwardRef } from 'react';
import type { SVGProps } from 'react';
import { StratisFrameIcon } from './StratisFrameIcon';

export type StratisFormulaIconProps = SVGProps<SVGSVGElement>;

export const StratisFormulaIcon = forwardRef<SVGSVGElement, StratisFormulaIconProps>(function StratisFormulaIcon(
  { className, ...props },
  ref
) {
  return (
    <StratisFrameIcon ref={ref} {...props} className={className}>
      <path
        d="M16.4 8.2H8L12 12L8 15.8H16.4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
        fill="none"
      />
    </StratisFrameIcon>
  );
});
