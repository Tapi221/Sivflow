import { forwardRef } from 'react';
import type { SVGProps } from 'react';

export type StratisVariantIconProps = SVGProps<SVGSVGElement>;

export const StratisVariantIcon = forwardRef<SVGSVGElement, StratisVariantIconProps>(function StratisVariantIcon(
  { className, ...props },
  ref
) {
  return (
    <svg ref={ref} {...props} fill="none" viewBox="0 0 24 24" className={['block', className].filter(Boolean).join(' ')} xmlns="http://www.w3.org/2000/svg"><path d="M11.3842 4.25508C11.7243 3.91497 12.2757 3.91497 12.6158 4.25508L19.7449 11.3842C20.085 11.7243 20.085 12.2757 19.7449 12.6158L12.6158 19.7449C12.2757 20.085 11.7243 20.085 11.3842 19.7449L4.25508 12.6158C3.91497 12.2757 3.91497 11.7243 4.25508 11.3842L11.3842 4.25508Z" stroke="currentColor" strokeWidth="2"/></svg>
  );
});
