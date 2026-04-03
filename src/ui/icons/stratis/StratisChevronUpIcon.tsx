import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisChevronUpIconProps = SVGProps<SVGSVGElement>;

export const StratisChevronUpIcon = forwardRef<
  SVGSVGElement,
  StratisChevronUpIconProps
>(function StratisChevronUpIcon({ className, ...props }, ref) {
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
        d="M7 14.5834L12.0008 10L17 14.5834"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});





