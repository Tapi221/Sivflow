import type { SVGProps } from "react";
import { forwardRef } from "react";

export type StratisXCircleContainedIconProps = SVGProps<SVGSVGElement>;

export const StratisXCircleContainedIcon = forwardRef<
  SVGSVGElement,
  StratisXCircleContainedIconProps
>(function StratisXCircleContainedIcon({ className, ...props }, ref) {
  return (
    <svg
      ref={ref}
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      className={["block", className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.182 8.81802L8.81802 15.182M8.81802 8.81802L15.182 15.182M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});