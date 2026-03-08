import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisInbox02IconProps = SVGProps<SVGSVGElement>;

export const StratisInbox02Icon = forwardRef<
  SVGSVGElement,
  StratisInbox02IconProps
>(function StratisInbox02Icon({ className, ...props }, ref) {
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
        d="M3 13.1429V17.7143C3 18.9767 4.00736 20 5.25 20H18.75C19.9926 20 21 18.9767 21 17.7143V13.1429M3 13.1429L5.82751 5.48315C6.15683 4.59102 6.99635 4 7.93425 4H16.0657C17.0037 4 17.8432 4.59102 18.1725 5.48315L21 13.1429M3 13.1429H7.5L9 14.7429H15L16.5 13.1429H21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});




