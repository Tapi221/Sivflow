import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisMenu04IconProps = SVGProps<SVGSVGElement>;

export const StratisMenu04Icon = forwardRef<
  SVGSVGElement,
  StratisMenu04IconProps
>(function StratisMenu04Icon({ className, ...props }, ref) {
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
        d="M13.5 18H4M20 12H4M20 6H4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});




