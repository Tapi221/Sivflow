import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisPlus02IconProps = SVGProps<SVGSVGElement>;

export const StratisPlus02Icon = forwardRef<
  SVGSVGElement,
  StratisPlus02IconProps
>(function StratisPlus02Icon({ className, ...props }, ref) {
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
        d="M12 6L12 18M18 12L6 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});
