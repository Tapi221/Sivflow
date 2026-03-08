import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisCode01IconProps = SVGProps<SVGSVGElement>;

export const StratisCode01Icon = forwardRef<
  SVGSVGElement,
  StratisCode01IconProps
>(function StratisCode01Icon({ className, ...props }, ref) {
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
        d="M9.5999 15L6.5999 12L9.5999 9.00002M14.3999 9.00002L17.3999 12L14.3999 15M4.7999 21.6C3.47442 21.6 2.3999 20.5255 2.3999 19.2V4.80002C2.3999 3.47454 3.47442 2.40002 4.7999 2.40002H19.1999C20.5254 2.40002 21.5999 3.47454 21.5999 4.80002V19.2C21.5999 20.5255 20.5254 21.6 19.1999 21.6H4.7999Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});




