import type { SVGProps } from "react";
import { forwardRef } from "react";









export type StratisKeyboardIconProps = SVGProps<SVGSVGElement>;









export const StratisKeyboardIcon = forwardRef<SVGSVGElement, StratisKeyboardIconProps>(function StratisKeyboardIcon({ className, ...props }, ref) { return ( <svg ref={ref} {...props} fill="none" viewBox="0 0 24 24" className={["block", className].filter(Boolean).join(" ")} xmlns="http://www.w3.org/2000/svg"> <path d="M4.5 6.75C4.5 5.50736 5.50736 4.5 6.75 4.5H17.25C18.4926 4.5 19.5 5.50736 19.5 6.75V17.25C19.5 18.4926 18.4926 19.5 17.25 19.5H6.75C5.50736 19.5 4.5 18.4926 4.5 17.25V6.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M8 8.5H8.01M11 8.5H11.01M14 8.5H14.01M16.75 8.5H16.76M7.25 11.5H7.26M10.25 11.5H10.26M13.25 11.5H13.26M16.25 11.5H16.26M8.5 14.5H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg> );
});
