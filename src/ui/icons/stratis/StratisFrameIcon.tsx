/* eslint-disable react-refresh/only-export-components -- shared SVG prop constants are co-located with icon component to keep API stable. */
import { forwardRef } from "react";
import type { ReactNode, SVGProps } from "react";

export type StratisFrameIconProps = SVGProps<SVGSVGElement> & {
  children?: ReactNode;
};

export const STRATIS_INNER_STROKE_PATH_PROPS: SVGProps<SVGPathElement> = {
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
  shapeRendering: "geometricPrecision",
  fill: "none",
};

const FRAME_PATH =
  "M3 6.375H2V17.625H3H4V6.375H3ZM6.375 21V22H17.625V21V20H6.375V21ZM21 17.625H22V6.375H21H20V17.625H21ZM17.625 3V2H6.375V3V4H17.625V3ZM21 6.375H22C22 3.95876 20.0412 2 17.625 2V3V4C18.9367 4 20 5.06332 20 6.375H21ZM17.625 21V22C20.0412 22 22 20.0412 22 17.625H21H20C20 18.9367 18.9367 20 17.625 20V21ZM3 17.625H2C2 20.0412 3.95876 22 6.375 22V21V20C5.06332 20 4 18.9367 4 17.625H3ZM3 6.375H4C4 5.06332 5.06332 4 6.375 4V3V2C3.95875 2 2 3.95875 2 6.375H3Z";

export const StratisFrameIcon = forwardRef<
  SVGSVGElement,
  StratisFrameIconProps
>(function StratisFrameIcon({ className, children, ...props }, ref) {
  return (
    <svg
      ref={ref}
      {...props}
      viewBox="0 0 24 24"
      className={["block", className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={FRAME_PATH} fill="currentColor" />
      {children}
    </svg>
  );
});





