import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const LARGE_ICON_THRESHOLD_PX = 32;

export const ExplorerChromeFolderIcon = ({
  size = 15,
  className,
  ...props
}: ExplorerChromeFolderIconProps) => {
  if (size >= LARGE_ICON_THRESHOLD_PX) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={cn("shrink-0", className)}
        {...props}
      >
        <path
          d="M6.8 19.4C6.8 15.42 10.02 12.2 14 12.2H27.16C29.36 12.2 31.4 13.2 32.75 14.94L36.16 19.34H50C53.98 19.34 57.2 22.56 57.2 26.54V48.1C57.2 52.08 53.98 55.3 50 55.3H14C10.02 55.3 6.8 52.08 6.8 48.1V19.4Z"
          fill="var(--explorer-chrome-folder-fill, #f0efe9)"
          stroke="var(--explorer-chrome-folder-stroke, #8b8a84)"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path
          d="M9.8 25.8H54.2"
          stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.92"
        />
        <path
          d="M11.4 31.2H52.6"
          stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.45"
        />
        <path
          d="M12.2 18.8H27.2C28.42 18.8 29.56 19.4 30.25 20.4L32.1 23.05"
          stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.64"
        />
      </svg>
    );
  }

  return (
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
};
