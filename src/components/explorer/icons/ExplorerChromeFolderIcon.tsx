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
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    className={cn("explorer-folder-color-mark shrink-0", className)}
    {...props}
  >
    <circle
      cx="10"
      cy="10"
      r="8.2"
      fill="var(--explorer-folder-mark-fill, #f8fffb)"
      stroke="var(--explorer-folder-mark-color, #6baa7e)"
      strokeWidth="2"
    />
    <path
      d="M6.4 10.1L8.7 12.4L13.8 7.4"
      stroke="var(--explorer-folder-mark-color, #6baa7e)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
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
