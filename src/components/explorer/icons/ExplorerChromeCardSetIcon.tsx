import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type ExplorerChromeCardSetIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export const ExplorerChromeCardSetIcon = ({
  size = 15,
  className,
  ...props
}: ExplorerChromeCardSetIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 17"
    fill="none"
    aria-hidden="true"
    className={cn("shrink-0", className)}
    {...props}
  >
    <rect
      x="3.4"
      y="4.1"
      width="13.2"
      height="10.2"
      rx="2.1"
      fill="var(--explorer-chrome-cardset-fill, #f0efe9)"
      stroke="var(--explorer-chrome-cardset-stroke, #8b8a84)"
      strokeWidth="1.5"
    />
    <path
      d="M5.4 6.1H14.6"
      stroke="var(--explorer-chrome-cardset-highlight, #fbfaf6)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.9"
    />
    <rect
      x="1.9"
      y="2.6"
      width="13.2"
      height="10.2"
      rx="2.1"
      fill="var(--explorer-chrome-cardset-fill, #f0efe9)"
      stroke="var(--explorer-chrome-cardset-stroke, #8b8a84)"
      strokeWidth="1.5"
      opacity="0.9"
    />
  </svg>
);
