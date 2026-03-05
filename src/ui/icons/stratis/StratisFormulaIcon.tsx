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
        d="M8.2 8.2H15.8V9.35H10.15L13.95 12L10.15 14.65H15.8V15.8H8.2V14.55L12.15 12L8.2 9.45V8.2Z"
        fill="currentColor"
      />
    </StratisFrameIcon>
  );
});
