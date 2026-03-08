import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisXSquareContainedIconProps = SVGProps<SVGSVGElement>;

export const StratisXSquareContainedIcon = forwardRef<
  SVGSVGElement,
  StratisXSquareContainedIconProps
>(function StratisXSquareContainedIcon({ className, ...props }, ref) {
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
        d="M15.182 8.81799L12 11.9999M12 11.9999L8.81802 15.1819M12 11.9999L15.182 15.1819M12 11.9999L8.81802 8.81799M21 6.37498L21 17.625C21 19.489 19.489 21 17.625 21H6.375C4.51104 21 3 19.489 3 17.625V6.37498C3 4.51103 4.51104 3 6.375 3H17.625C19.489 3 21 4.51103 21 6.37498Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});



