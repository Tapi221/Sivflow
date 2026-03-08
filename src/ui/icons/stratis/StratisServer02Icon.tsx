import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisServer02IconProps = SVGProps<SVGSVGElement>;

export const StratisServer02Icon = forwardRef<
  SVGSVGElement,
  StratisServer02IconProps
>(function StratisServer02Icon({ className, ...props }, ref) {
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
        d="M21.5999 6.6C21.5999 8.58823 17.3018 10.2 11.9999 10.2C6.69797 10.2 2.3999 8.58823 2.3999 6.6M21.5999 6.6C21.5999 4.61177 17.3018 3 11.9999 3C6.69797 3 2.3999 4.61177 2.3999 6.6M21.5999 6.6V17.4C21.5999 19.3882 17.3018 21 11.9999 21C6.69797 21 2.3999 19.3882 2.3999 17.4V6.6M21.5999 12C21.5999 13.9882 17.3018 15.6 11.9999 15.6C6.69797 15.6 2.3999 13.9882 2.3999 12"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
});



