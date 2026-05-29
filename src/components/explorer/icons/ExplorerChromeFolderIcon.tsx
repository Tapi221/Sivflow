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
    className={cn("shrink-0", className)}
    {...props}
  >
    <path
      d="M3.2 5.45C3.2 4.47 3.99 3.68 4.97 3.68H8.24C8.76 3.68 9.25 3.91 9.59 4.3L10.95 5.86H15.03C16.01 5.86 16.8 6.65 16.8 7.63V14.55C16.8 15.53 16.01 16.32 15.03 16.32H4.97C3.99 16.32 3.2 15.53 3.2 14.55V5.45Z"
      fill="var(--explorer-chrome-folder-fill, transparent)"
      stroke="var(--explorer-chrome-folder-stroke, var(--app-sidebar-icon, #8a8a8a))"
      strokeWidth="1.45"
      strokeLinejoin="round"
    />
    <path
      d="M3.42 8.42H16.58"
      stroke="var(--explorer-chrome-folder-stroke, var(--app-sidebar-icon, #8a8a8a))"
      strokeWidth="1.45"
      strokeLinecap="round"
    />
    <path
      d="M5.05 5.98H8.43C8.82 5.98 9.19 6.15 9.44 6.44L10.55 7.72"
      stroke="var(--explorer-chrome-folder-highlight, transparent)"
      strokeWidth="1.1"
      strokeLinecap="round"
      opacity="0.6"
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
      d="M7.25 18.9C7.25 15.3 10.15 12.4 13.75 12.4H26.72C28.82 12.4 30.78 13.41 32 15.12L34.9 19.18H50.25C53.85 19.18 56.75 22.08 56.75 25.68V47.9C56.75 51.5 53.85 54.4 50.25 54.4H13.75C10.15 54.4 7.25 51.5 7.25 47.9V18.9Z"
      fill="var(--explorer-chrome-folder-fill, #f0efe9)"
      stroke="var(--explorer-chrome-folder-stroke, #8b8a84)"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path
      d="M9.85 27.45H54.15"
      stroke="var(--explorer-chrome-folder-stroke, #8b8a84)"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.92"
    />
    <path
      d="M11.95 32.75H52.05"
      stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.42"
    />
    <path
      d="M12.7 18.25H26.52C28.04 18.25 29.45 18.98 30.34 20.22L32.08 22.64"
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
