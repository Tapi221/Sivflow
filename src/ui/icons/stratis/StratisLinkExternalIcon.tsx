import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisLinkExternalIconProps = SVGProps<SVGSVGElement>;

export const StratisLinkExternalIcon = forwardRef<
  SVGSVGElement,
  StratisLinkExternalIconProps
>(function StratisLinkExternalIcon({ className, ...props }, ref) {
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
        d="M10.875 3H6.375C4.51104 3 3 4.51103 3 6.37498V17.625C3 19.489 4.51104 21 6.375 21H17.625C19.489 21 21 19.489 21 17.625V13.1249M15.3744 3.00027L21 3M21 3V8.06261M21 3L11.4367 12.5622"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
