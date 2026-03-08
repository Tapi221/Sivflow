import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisMap01IconProps = SVGProps<SVGSVGElement>;

export const StratisMap01Icon = forwardRef<
  SVGSVGElement,
  StratisMap01IconProps
>(function StratisMap01Icon({ className, ...props }, ref) {
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
        d="M8.625 16.0476V10.0238M14.8125 13.8571V7.83333M3 17.7143V4L8.47826 6.28571L14.7391 4L21 6.28571V20L14.7391 17.7143L8.47826 20L3 17.7143Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});




