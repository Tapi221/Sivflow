import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisSortHorizontalIconProps = SVGProps<SVGSVGElement>;

export const StratisSortHorizontalIcon = forwardRef<
  SVGSVGElement,
  StratisSortHorizontalIconProps
>(function StratisSortHorizontalIcon({ className, ...props }, ref) {
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
        d="M8.3998 15.6L4.7998 12L8.39981 8.40002M15.5998 8.40002L19.1998 12L15.5998 15.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});




