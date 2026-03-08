import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisPlus03IconProps = SVGProps<SVGSVGElement>;

export const StratisPlus03Icon = forwardRef<
  SVGSVGElement,
  StratisPlus03IconProps
>(function StratisPlus03Icon({ className, ...props }, ref) {
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
        d="M12 7.19995L12 16.8M16.8 12L7.19995 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});




