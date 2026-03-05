import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisAddSquare01IconProps = SVGProps<SVGSVGElement>;

export const StratisAddSquare01Icon = forwardRef<
  SVGSVGElement,
  StratisAddSquare01IconProps
>(function StratisAddSquare01Icon({ className, ...props }, ref) {
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
        d="M15.3754 11.9995H12.0004M12.0004 11.9995H8.62537M12.0004 11.9995V15.3744M12.0004 11.9995L12.0004 8.62447M21 6.37498L21 17.625C21 19.489 19.489 21 17.625 21H6.375C4.51104 21 3 19.489 3 17.625V6.37498C3 4.51103 4.51104 3 6.375 3H17.625C19.489 3 21 4.51103 21 6.37498Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});
