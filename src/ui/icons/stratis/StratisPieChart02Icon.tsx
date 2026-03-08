import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisPieChart02IconProps = SVGProps<SVGSVGElement>;

export const StratisPieChart02Icon = forwardRef<
  SVGSVGElement,
  StratisPieChart02IconProps
>(function StratisPieChart02Icon({ className, ...props }, ref) {
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
        d="M11.4352 21.8825C16.4252 21.8825 20.4705 17.8372 20.4705 12.8472H11.4352L11.4352 3.81183C6.44517 3.8118 2.3999 7.85708 2.3999 12.8472C2.3999 17.8372 6.44514 21.8825 11.4352 21.8825Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.3881 2.11755V8.80715H21.5999V8.32932C21.5999 4.89866 18.8188 2.11755 15.3881 2.11755Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});



