import { forwardRef } from 'react';
import type { SVGProps } from 'react';

export type StratisActivityIconProps = SVGProps<SVGSVGElement>;

export const StratisActivityIcon = forwardRef<SVGSVGElement, StratisActivityIconProps>(function StratisActivityIcon(
  { className, ...props },
  ref
) {
  return (
    <svg ref={ref} {...props} fill="none" viewBox="0 0 24 24" className={['block', className].filter(Boolean).join(' ')} xmlns="http://www.w3.org/2000/svg"><path d="M4 11.6661H8L10.0404 5L14.4382 19L15.9903 11.6661H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
});
