import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisX01IconProps = SVGProps<SVGSVGElement>;

export const StratisX01Icon = forwardRef<SVGSVGElement, StratisX01IconProps>(
  function StratisX01Icon({ className, ...props }, ref) {
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
          d="M20 4L4 20M20 20L4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  },
);
