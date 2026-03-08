import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisChevronLeftIconProps = SVGProps<SVGSVGElement>;

export const StratisChevronLeftIcon = forwardRef<
  SVGSVGElement,
  StratisChevronLeftIconProps
>(function StratisChevronLeftIcon({ className, ...props }, ref) {
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
        d="M15 17L10 12L15 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});



