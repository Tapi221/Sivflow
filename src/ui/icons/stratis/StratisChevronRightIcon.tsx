import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisChevronRightIconProps = SVGProps<SVGSVGElement>;

export const StratisChevronRightIcon = forwardRef<
  SVGSVGElement,
  StratisChevronRightIconProps
>(function StratisChevronRightIcon({ className, ...props }, ref) {
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
        d="M10 7L15 12L10 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});



