import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  variant?: "default" | "large";
};

const ROUNDED_FOLDER_OUTLINE_PATH = "M3.5 8.75C3.5 7.23 4.73 6 6.25 6H8.72C9.34 6 9.93 6.23 10.39 6.65L11.85 8.01C12.28 8.41 12.85 8.63 13.44 8.63H17.75C19.27 8.63 20.5 9.86 20.5 11.38V16.25C20.5 17.77 19.27 19 17.75 19H6.25C4.73 19 3.5 17.77 3.5 16.25V8.75Z";
const ROUNDED_FOLDER_LIP_PATH = "M3.85 11.35C4.39 10.82 5.14 10.53 5.95 10.53H18.05C18.86 10.53 19.61 10.82 20.15 11.35";

const ExplorerChromeFolderIconSmall = ({
  size,
  className,
  ...props
}: Omit<ExplorerChromeFolderIconProps, "variant">) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--explorer-chrome-folder-stroke, currentColor)"
    aria-hidden="true"
    className={cn("shrink-0", className)}
    {...props}
  >
    <path
      d={ROUNDED_FOLDER_OUTLINE_PATH}
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d={ROUNDED_FOLDER_LIP_PATH}
      strokeWidth="1.55"
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
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--explorer-chrome-folder-stroke, currentColor)"
    aria-hidden="true"
    className={cn("shrink-0", className)}
    {...props}
  >
    <path
      d={ROUNDED_FOLDER_OUTLINE_PATH}
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d={ROUNDED_FOLDER_LIP_PATH}
      strokeWidth="1.55"
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
