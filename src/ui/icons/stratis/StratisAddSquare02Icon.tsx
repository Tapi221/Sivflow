import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisAddSquare02IconProps = SVGProps<SVGSVGElement>;

export const StratisAddSquare02Icon = forwardRef<
  SVGSVGElement,
  StratisAddSquare02IconProps
>(function StratisAddSquare02Icon({ className, ...props }, ref) {
  return (
    <svg
      ref={ref}
      {...props}
      fill="none"
      viewBox="0 0 24 24"
      className={["block", className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.9">
        <path
          d="M15.375 11.9995H12M12 11.9995H8.625M12 11.9995V15.3745M12 11.9995L12 8.62445M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
});




