import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisAudioSettings01IconProps = SVGProps<SVGSVGElement>;

export const StratisAudioSettings01Icon = forwardRef<
  SVGSVGElement,
  StratisAudioSettings01IconProps
>(function StratisAudioSettings01Icon({ className, ...props }, ref) {
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
        d="M2.3999 4.80002L11.9999 4.80002M2.3999 12H11.9999M11.9999 12V14.4M11.9999 12V9.60002M2.3999 19.2H7.1999M11.9999 19.2L21.5999 19.2M16.7999 12H21.5999M16.7999 4.80002L21.5999 4.80003M16.7999 4.80002V7.20002M16.7999 4.80002V2.40002M7.7999 21.6V16.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});





