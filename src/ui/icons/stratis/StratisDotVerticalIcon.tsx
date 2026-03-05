import { forwardRef } from 'react';
import type { SVGProps } from 'react';

export type StratisDotVerticalIconProps = SVGProps<SVGSVGElement>;

export const StratisDotVerticalIcon = forwardRef<SVGSVGElement, StratisDotVerticalIconProps>(function StratisDotVerticalIcon(
  { className, ...props },
  ref
) {
  return (
    <svg ref={ref} {...props} fill="none" viewBox="0 0 24 24" className={['block', className].filter(Boolean).join(' ')} xmlns="http://www.w3.org/2000/svg"><path d="M12.0001 7.20002C10.6746 7.20002 9.6001 6.12551 9.6001 4.80002C9.6001 3.47454 10.6746 2.40002 12.0001 2.40002C13.3256 2.40002 14.4001 3.47454 14.4001 4.80002C14.4001 6.12551 13.3256 7.20002 12.0001 7.20002Z" stroke="currentColor" strokeWidth="2"/>
<path d="M12.0001 14.4C10.6746 14.4 9.6001 13.3255 9.6001 12C9.6001 10.6745 10.6746 9.60002 12.0001 9.60002C13.3256 9.60002 14.4001 10.6745 14.4001 12C14.4001 13.3255 13.3256 14.4 12.0001 14.4Z" stroke="currentColor" strokeWidth="2"/>
<path d="M12.0001 21.6C10.6746 21.6 9.6001 20.5255 9.6001 19.2C9.6001 17.8745 10.6746 16.8 12.0001 16.8C13.3256 16.8 14.4001 17.8745 14.4001 19.2C14.4001 20.5255 13.3256 21.6 12.0001 21.6Z" stroke="currentColor" strokeWidth="2"/></svg>
  );
});
