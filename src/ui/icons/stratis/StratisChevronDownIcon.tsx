import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisChevronDownIconProps = SVGProps<SVGSVGElement>;

export const StratisChevronDownIcon = forwardRef<
  SVGSVGElement,
  StratisChevronDownIconProps
>(function StratisChevronDownIcon({ className, ...props }, ref) {
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
        d="M7 10L12.0008 14.58L17 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
