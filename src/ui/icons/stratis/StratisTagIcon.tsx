import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisTagIconProps = SVGProps<SVGSVGElement>;

export const StratisTagIcon = forwardRef<SVGSVGElement, StratisTagIconProps>(
  function StratisTagIcon({ className, ...props }, ref) {
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
          d="M16.3539 7.65251L16.3475 7.65247M19.5224 2.85142L13.7221 2.40523C13.2078 2.36568 12.702 2.55281 12.3373 2.91751L2.91738 12.3374C2.22741 13.0274 2.22741 14.146 2.91738 14.836L9.16393 21.0825C9.8539 21.7725 10.9726 21.7725 11.6625 21.0825L21.0824 11.6627C21.4471 11.298 21.6342 10.7921 21.5947 10.2779L21.1485 4.4775C21.0817 3.60862 20.3913 2.91825 19.5224 2.85142Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  },
);
