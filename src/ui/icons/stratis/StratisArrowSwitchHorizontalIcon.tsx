import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisArrowSwitchHorizontalIconProps = SVGProps<SVGSVGElement>;

export const StratisArrowSwitchHorizontalIcon = forwardRef<
  SVGSVGElement,
  StratisArrowSwitchHorizontalIconProps
>(function StratisArrowSwitchHorizontalIcon({ className, ...props }, ref) {
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
        d="M14.25 6.375L17.625 3M17.625 3L21 6.375M17.625 3L17.625 21M9.75 17.625L6.375 21M6.375 21L3 17.625M6.375 21L6.375 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
