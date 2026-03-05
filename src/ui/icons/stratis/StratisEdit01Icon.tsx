import { forwardRef } from "react";
import type { SVGProps } from "react";

export type StratisEdit01IconProps = SVGProps<SVGSVGElement>;

export const StratisEdit01Icon = forwardRef<
  SVGSVGElement,
  StratisEdit01IconProps
>(function StratisEdit01Icon({ className, ...props }, ref) {
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
        d="M12.5366 19.243L13.2789 18.4111C14.1897 17.3904 15.8237 17.523 16.5579 18.6774C17.2418 19.7527 18.7275 19.9565 19.6758 19.1051L21.0212 17.8971M2.979 19.4701L7.34499 18.5904C7.57677 18.5437 7.78958 18.4295 7.95672 18.2623L17.7304 8.48325C18.199 8.0144 18.1987 7.25441 17.7297 6.78595L15.6593 4.71787C15.1905 4.24961 14.4309 4.24993 13.9625 4.71859L4.18777 14.4986C4.02095 14.6655 3.90705 14.8779 3.86031 15.1092L2.979 19.4701Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
