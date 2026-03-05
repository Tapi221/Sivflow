import { forwardRef } from 'react';
import type { SVGProps } from 'react';

export type StratisX03IconProps = SVGProps<SVGSVGElement>;

export const StratisX03Icon = forwardRef<SVGSVGElement, StratisX03IconProps>(function StratisX03Icon(
  { className, ...props },
  ref
) {
  return (
    <svg ref={ref} {...props} fill="none" viewBox="0 0 24 24" className={['block', className].filter(Boolean).join(' ')} xmlns="http://www.w3.org/2000/svg"><path d="M16 8L8 16M16 16L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  );
});
