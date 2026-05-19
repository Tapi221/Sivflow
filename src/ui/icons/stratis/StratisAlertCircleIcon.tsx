import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisAlertCircleIconProps = SVGProps<SVGSVGElement>;

export const StratisAlertCircleIcon = forwardRef<
  SVGSVGElement,
  StratisAlertCircleIconProps
>(function StratisAlertCircleIcon({ className, ...props }, ref) {
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
        d="M12 12V7.5M12 15.3354V15.375M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
