import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisSortVertical01IconProps = SVGProps<SVGSVGElement>;

export const StratisSortVertical01Icon = forwardRef<
  SVGSVGElement,
  StratisSortVertical01IconProps
>(function StratisSortVertical01Icon({ className, ...props }, ref) {
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
        d="M15.5999 15.6L11.9999 19.2L8.3999 15.6M8.3999 8.39999L11.9999 4.79999L15.5999 8.39999"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});




