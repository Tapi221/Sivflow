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
        d="M7.2 7.5H16.8V9.3H11.05L14.9 12L11.05 14.7H16.8V16.5H7.2V14.45L11.95 12L7.2 9.55V7.5Z"
        fill="currentColor"
      />
    </StratisFrameIcon>
  );
});
