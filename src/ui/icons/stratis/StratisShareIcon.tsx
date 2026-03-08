import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisShareIconProps = SVGProps<SVGSVGElement>;

export const StratisShareIcon = forwardRef<
  SVGSVGElement,
  StratisShareIconProps
>(function StratisShareIcon({ className, ...props }, ref) {
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
        d="M21.0002 11.459L11.4002 5.09998L11.4002 8.69998C3 10.5 3 18.9 3 18.9C3 18.9 6.6 14.1 11.4002 14.7L11.4002 18.42L21.0002 11.459Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
});



