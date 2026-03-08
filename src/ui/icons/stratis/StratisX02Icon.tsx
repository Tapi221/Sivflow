import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisX02IconProps = SVGProps<SVGSVGElement>;

export const StratisX02Icon = forwardRef<SVGSVGElement, StratisX02IconProps>(
  function StratisX02Icon({ className, ...props }, ref) {
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
          d="M18 6L6 18M18 18L6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  },
);




