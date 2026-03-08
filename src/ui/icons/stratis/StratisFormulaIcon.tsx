import { forwardRef } from "react";
import type { SVGProps } from "react";
import {
  STRATIS_INNER_STROKE_PATH_PROPS,
  StratisFrameIcon,
} from "./StratisFrameIcon";

export type StratisFormulaIconProps = SVGProps<SVGSVGElement>;

export const StratisFormulaIcon = forwardRef<
  SVGSVGElement,
  StratisFormulaIconProps
>(function StratisFormulaIcon({ className, ...props }, ref) {
  return (
    <StratisFrameIcon ref={ref} {...props} className={className}>
      <path
        d="M16.4 8.2H8L12 12L8 15.8H16.4"
        {...STRATIS_INNER_STROKE_PATH_PROPS}
      />
    </StratisFrameIcon>
  );
});




