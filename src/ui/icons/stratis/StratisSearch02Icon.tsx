import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisSearch02IconProps = SVGProps<SVGSVGElement>;

export const StratisSearch02Icon = forwardRef<
  SVGSVGElement,
  StratisSearch02IconProps
>(function StratisSearch02Icon({ className, ...props }, ref) {
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
        d="M16.927 17.04L20.4001 20.4M11.4001 7.19998C13.3883 7.19998 15.0001 8.81175 15.0001 10.8M19.2801 11.44C19.2801 15.7699 15.77 19.28 11.4401 19.28C7.11018 19.28 3.6001 15.7699 3.6001 11.44C3.6001 7.11006 7.11018 3.59998 11.4401 3.59998C15.77 3.59998 19.2801 7.11006 19.2801 11.44Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});
