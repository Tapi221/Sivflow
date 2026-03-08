import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisCode02IconProps = SVGProps<SVGSVGElement>;

export const StratisCode02Icon = forwardRef<
  SVGSVGElement,
  StratisCode02IconProps
>(function StratisCode02Icon({ className, ...props }, ref) {
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
        d="M10.7999 17.7001L13.1999 6.30005M5.9999 15.9001L2.3999 12.3L5.9999 8.70005M17.9999 8.70005L21.5999 12.3L17.9999 15.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});




