import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  variant?: "default" | "large";
};

const PROJECT_FOLDER_ICON_PATHS = [
  "M9 6.75V5.25C9 4.42157 9.67157 3.75 10.5 3.75H13.5C14.3284 3.75 15 4.42157 15 5.25V6.75",
  "M4.5 6.75H19.5C20.3284 6.75 21 7.42157 21 8.25V18.75C21 19.5784 20.3284 20.25 19.5 20.25H4.5C3.67157 20.25 3 19.5784 3 18.75V8.25C3 7.42157 3.67157 6.75 4.5 6.75Z",
  "M3 11.25H21",
  "M10.5 12.75H13.5",
] as const;

const ExplorerChromeFolderIconSmall = ({ size, className, ...props }: Omit<ExplorerChromeFolderIconProps, "variant">) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--explorer-chrome-folder-stroke, currentColor)" aria-hidden="true" className={cn("shrink-0", className)} {...props}>
    {PROJECT_FOLDER_ICON_PATHS.map((path) => (
      <path key={path} d={path} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </svg>
);

const ExplorerChromeFolderIconLarge = ({ size, className, ...props }: Omit<ExplorerChromeFolderIconProps, "variant">) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--explorer-chrome-folder-stroke, currentColor)" aria-hidden="true" className={cn("shrink-0", className)} {...props}>
    {PROJECT_FOLDER_ICON_PATHS.map((path) => (
      <path key={path} d={path} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </svg>
);

export const ExplorerChromeFolderIcon = ({ size = 15, variant = "default", className, ...props }: ExplorerChromeFolderIconProps) => {
  if (variant === "large") {
    return <ExplorerChromeFolderIconLarge size={size} className={className} {...props} />;
  }

  return <ExplorerChromeFolderIconSmall size={size} className={className} {...props} />;
};
