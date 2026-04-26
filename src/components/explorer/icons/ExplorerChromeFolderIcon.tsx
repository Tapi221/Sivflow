import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  variant?: "default" | "large";
};

const ExplorerChromeFolderIconSmall = ({
  size,
  className,
  ...props
}: Omit<ExplorerChromeFolderIconProps, "variant">) => (
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

const ExplorerChromeFolderIconLarge = ({
  size,
  className,
  ...props
}: Omit<ExplorerChromeFolderIconProps, "variant">) => (
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
      d="M7.25 19.35C7.25 15.75 10.15 12.85 13.75 12.85H27.05C29.12 12.85 31.06 13.84 32.28 15.51L35.21 19.54H50.25C53.85 19.54 56.75 22.44 56.75 26.04V47.9C56.75 51.5 53.85 54.4 50.25 54.4H13.75C10.15 54.4 7.25 51.5 7.25 47.9V19.35Z"
      fill="var(--explorer-chrome-folder-fill, #f0efe9)"
      stroke="var(--explorer-chrome-folder-stroke, #8b8a84)"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path
      d="M9.95 25.88H54.05"
      stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.92"
    />
    <path
      d="M12.15 31.35H51.85"
      stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.42"
    />
    <path
      d="M12.7 18.9H26.72C28.2 18.9 29.58 19.61 30.45 20.79L32.11 23.04"
      stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.58"
    />
  </svg>
);

export const ExplorerChromeFolderIcon = ({
  size = 15,
  variant = "default",
  className,
  ...props
}: ExplorerChromeFolderIconProps) => {
  if (variant === "large") {
    return (
      <ExplorerChromeFolderIconLarge
        size={size}
        className={className}
        {...props}
      />
    );
  }

  return (
    <ExplorerChromeFolderIconSmall
      size={size}
      className={className}
      {...props}
    />
  );
};
