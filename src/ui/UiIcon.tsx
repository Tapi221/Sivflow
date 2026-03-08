import type { SVGProps } from "react";

export type UiIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
};

export function UiIcon({
  size = 20,
  strokeWidth = 1.8,
  style,
  ...props
}: UiIconProps) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ vectorEffect: "non-scaling-stroke", ...style }}
    />
  );
}



