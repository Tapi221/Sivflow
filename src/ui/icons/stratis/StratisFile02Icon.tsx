import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisFile02IconProps = SVGProps<SVGSVGElement>;

export const StratisFile02Icon = forwardRef<
  SVGSVGElement,
  StratisFile02IconProps
>(function StratisFile02Icon({ className, ...props }, ref) {
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
        d="M8.40033 7.20002H15.6003M8.40033 10.8H15.6003M8.40033 14.4H12.0003M6.60004 2.40002H17.4003C18.7258 2.40002 19.8003 3.47457 19.8003 4.80007L19.8 19.2001C19.8 20.5255 18.7254 21.6 17.4 21.6L6.59994 21.6C5.27446 21.6 4.19994 20.5254 4.19995 19.2L4.20004 4.80001C4.20005 3.47453 5.27457 2.40002 6.60004 2.40002Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});



