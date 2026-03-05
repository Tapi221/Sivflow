import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisFolderOpen03IconProps = SVGProps<SVGSVGElement>;

export const StratisFolderOpen03Icon = forwardRef<
  SVGSVGElement,
  StratisFolderOpen03IconProps
>(function StratisFolderOpen03Icon({ className, ...props }, ref) {
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
        d="M5.39999 5.32947V3.52947C5.39999 2.86673 5.93724 2.32947 6.59999 2.32947H18C18.6627 2.32947 19.2 2.86673 19.2 3.52947V8.32947M2.40093 19.2705L2.40102 10.1462C2.40102 9.23223 2.40068 7.9305 2.40039 6.98795C2.40019 6.32503 2.93752 5.78826 3.60044 5.78826H9.31865L12.0837 8.74189H20.4C21.0627 8.74189 21.6 9.27917 21.6 9.94193L21.5997 19.2706C21.5996 20.5961 20.5251 21.6705 19.1997 21.6705L4.80092 21.6705C3.47543 21.6705 2.40091 20.596 2.40093 19.2705Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
