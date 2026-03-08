import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisPlus01IconProps = SVGProps<SVGSVGElement>;

export const StratisPlus01Icon = forwardRef<
  SVGSVGElement,
  StratisPlus01IconProps
>(function StratisPlus01Icon({ className, ...props }, ref) {
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
        d="M12.0001 4.80005L12 19.2M19.2 12L4.80005 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});



