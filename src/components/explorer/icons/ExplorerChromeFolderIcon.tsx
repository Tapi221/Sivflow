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
      d="M3.1 6.45C3.1 5.54 3.84 4.8 4.75 4.8H8.48C8.88 4.8 9.25 4.95 9.54 5.23L10.92 6.55H15.25C16.16 6.55 16.9 7.29 16.9 8.2V13.9C16.9 14.81 16.16 15.55 15.25 15.55H4.75C3.84 15.55 3.1 14.81 3.1 13.9V6.45Z"
      stroke="var(--explorer-chrome-folder-stroke, var(--app-sidebar-icon, currentColor))"
      strokeWidth="1.65"
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
      d="M8.6 20.5C8.6 16.8 11.6 13.8 15.3 13.8H27.6C29.2 13.8 30.72 14.39 31.9 15.48L37.08 20.25H48.7C52.4 20.25 55.4 23.25 55.4 26.95V43.5C55.4 47.2 52.4 50.2 48.7 50.2H15.3C11.6 50.2 8.6 47.2 8.6 43.5V20.5Z"
      stroke="var(--explorer-chrome-folder-stroke, #8b8a84)"
      strokeWidth="4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
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
