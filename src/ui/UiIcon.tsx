import type { SVGProps } from "react";



type UiIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number | string;
};



const UiIcon = ({
  size = 20,
  strokeWidth = 1.5,
  style,
  ...props
}: UiIconProps) => {
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
      style={{
        display: "block",
        flexShrink: 0,
        vectorEffect: "non-scaling-stroke",
        ...style,
      }}
    />
  );
};



export { UiIcon };



export type { UiIconProps };
