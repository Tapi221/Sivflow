import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisMarker01IconProps = SVGProps<SVGSVGElement>;

export const StratisMarker01Icon = forwardRef<
  SVGSVGElement,
  StratisMarker01IconProps
>(function StratisMarker01Icon({ className, ...props }, ref) {
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
        d="M3 21H7.90909M5.45455 12.3913V3H21L18.5455 7.69565L21 12.3913H5.45455ZM5.45455 12.3913V20.2174"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
