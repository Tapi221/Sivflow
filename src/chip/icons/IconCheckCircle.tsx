import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type IconCheckCircleProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export const IconCheckCircle = ({
  className,
  title,
  ...props
}: IconCheckCircleProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      className={cn("h-[22px] w-[22px]", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <rect x="0.75" y="0.75" width="20.5" height="20.5" rx="10.25" fill="#007AFF" />
      <rect
        x="0.75"
        y="0.75"
        width="20.5"
        height="20.5"
        rx="10.25"
        stroke="white"
        strokeWidth="1.5"
      />
      <path
        d="M9.97307 15.7651C10.2679 15.7651 10.4978 15.6502 10.6577 15.4103L15.3351 8.17435C15.455 7.99445 15.5 7.83454 15.5 7.67962C15.5 7.28484 15.2102 7 14.8054 7C14.5255 7 14.3556 7.09994 14.1857 7.36979L9.95308 14.0761L7.78429 11.3276C7.61938 11.1227 7.44947 11.0328 7.20461 11.0328C6.79484 11.0328 6.5 11.3226 6.5 11.7224C6.5 11.8973 6.55997 12.0622 6.70489 12.2371L9.29345 15.4253C9.48334 15.6602 9.69323 15.7651 9.97307 15.7651Z"
        fill="white"
      />
    </svg>
  );
};
