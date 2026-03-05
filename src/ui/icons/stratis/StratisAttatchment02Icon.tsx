import { forwardRef } from 'react';
import type { SVGProps } from 'react';

export type StratisAttatchment02IconProps = SVGProps<SVGSVGElement>;

export const StratisAttatchment02Icon = forwardRef<SVGSVGElement, StratisAttatchment02IconProps>(function StratisAttatchment02Icon(
  { className, ...props },
  ref
) {
  return (
    <svg ref={ref} {...props} fill="none" viewBox="0 0 24 24" className={['block', className].filter(Boolean).join(' ')} xmlns="http://www.w3.org/2000/svg"><path d="M17.4806 6.07196L17.4806 17.2812C17.4806 20.3321 15.373 22.8 12.2623 22.8C9.21142 22.8 7.19971 20.3918 7.19971 17.2812L7.19971 4.68084C7.19971 2.75238 8.75203 1.20005 10.6805 1.20005C12.609 1.20005 14.1613 2.75238 14.1613 4.68084L14.1613 17.5025C14.1613 18.4636 13.3821 19.2428 12.4209 19.2428C11.4597 19.2428 10.6805 18.4636 10.6805 17.5025L10.6805 6.07196" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  );
});
