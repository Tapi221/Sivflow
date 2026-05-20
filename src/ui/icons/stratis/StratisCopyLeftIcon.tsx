import type { SVGProps } from "react";
import { forwardRef } from "react";

export type StratisCopyLeftIconProps = SVGProps<SVGSVGElement>;

export const StratisCopyLeftIcon = forwardRef<
  SVGSVGElement,
  StratisCopyLeftIconProps
>(function StratisCopyLeftIcon({ className, ...props }, ref) {
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
        d="M4 13.125L4 7C4 4.79086 5.79086 3 8 3L14.125 3M10 21L16.75 21C17.9926 21 19 19.9926 19 18.75L19 9C19 7.75736 17.9926 6.75 16.75 6.75L10 6.75C8.75736 6.75 7.75 7.75736 7.75 9L7.75 18.75C7.75 19.9926 8.75736 21 10 21Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
});
