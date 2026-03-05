import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisComponentIconProps = SVGProps<SVGSVGElement>;

export const StratisComponentIcon = forwardRef<
  SVGSVGElement,
  StratisComponentIconProps
>(function StratisComponentIcon({ className, ...props }, ref) {
  return (
    <svg
      ref={ref}
      {...props}
      fill="none"
      viewBox="0 0 24 24"
      className={["block", className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.9998 6.00004H14.9998M4.7998 4.80002V19.2C4.7998 20.5255 5.87432 21.6 7.1998 21.6H16.7998C18.1253 21.6 19.1998 20.5255 19.1998 19.2V4.80004C19.1998 3.47456 18.1253 2.40004 16.7998 2.40004L7.19981 2.40002C5.87432 2.40002 4.7998 3.47454 4.7998 4.80002ZM11.9998 16.8H12.0848V16.8769H11.9998V16.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
