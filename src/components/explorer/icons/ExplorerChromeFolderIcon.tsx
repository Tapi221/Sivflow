import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export const ExplorerChromeFolderIcon = ({
  size = 15,
  className,
  ...props
}: ExplorerChromeFolderIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 17"
    fill="none"
    aria-hidden="true"
    className={cn("shrink-0", className)}
    {...props}
  >
    <path
      d="M1.5 4.25C1.5 3.42 2.17 2.75 3 2.75H7.25C7.79 2.75 8.29 3.04 8.56 3.5L9.25 4.7H17C17.83 4.7 18.5 5.37 18.5 6.2V13.6C18.5 14.43 17.83 15.1 17 15.1H3C2.17 15.1 1.5 14.43 1.5 13.6V4.25Z"
      fill="var(--explorer-chrome-folder-fill, #f0efe9)"
      stroke="var(--explorer-chrome-folder-stroke, #8b8a84)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M2.4 6.6H17.6"
      stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.9"
    />
  </svg>
);

