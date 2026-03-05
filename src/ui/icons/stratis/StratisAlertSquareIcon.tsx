import { forwardRef } from 'react';
import type { SVGProps } from 'react';

export type StratisAlertSquareIconProps = SVGProps<SVGSVGElement>;

export const StratisAlertSquareIcon = forwardRef<SVGSVGElement, StratisAlertSquareIconProps>(function StratisAlertSquareIcon(
  { className, ...props },
  ref
) {
  return (
    <svg ref={ref} {...props} fill="none" viewBox="0 0 24 24" className={['block', className].filter(Boolean).join(' ')} xmlns="http://www.w3.org/2000/svg"><path d="M12 11.9999V7.49997M12 15.3354V15.3749M21 6.37498L21 17.625C21 19.489 19.489 21 17.625 21H6.375C4.51104 21 3 19.489 3 17.625V6.37498C3 4.51103 4.51104 3 6.375 3H17.625C19.489 3 21 4.51103 21 6.37498Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
});
