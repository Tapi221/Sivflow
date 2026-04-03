import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisFilterIconProps = SVGProps<SVGSVGElement>;

export const StratisFilterIcon = forwardRef<
  SVGSVGElement,
  StratisFilterIconProps
>(function StratisFilterIcon({ className, ...props }, ref) {
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
        d="M6.46154 12H17.5385M4 7H20M10.1538 17H13.8462"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
