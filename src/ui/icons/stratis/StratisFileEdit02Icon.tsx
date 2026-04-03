import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisFileEdit02IconProps = SVGProps<SVGSVGElement>;

export const StratisFileEdit02Icon = forwardRef<
  SVGSVGElement,
  StratisFileEdit02IconProps
>(function StratisFileEdit02Icon({ className, ...props }, ref) {
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
        d="M9.55718 21.5574H4.75717C3.43168 21.5574 2.35717 20.4828 2.35718 19.1574L2.35727 4.75741C2.35728 3.43193 3.43179 2.35742 4.75727 2.35742H15.5575C16.883 2.35742 17.9575 3.43194 17.9575 4.75742V9.55742M6.55755 7.15742H13.7576M6.55755 10.7574H13.7576M6.55755 14.3574H10.1576M13.1574 18.2484L18.2485 13.1573L21.6427 16.5514L16.5515 21.6426H13.1574V18.2484Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
