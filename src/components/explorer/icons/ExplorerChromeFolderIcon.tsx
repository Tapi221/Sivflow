import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const FOLDER_OUTLINE_PATH = "M3.5 7.25C3.5 6.01 4.51 5 5.75 5H9.35C10.03 5 10.67 5.31 11.1 5.84L12.05 7H18.25C19.49 7 20.5 8.01 20.5 9.25V17.25C20.5 18.49 19.49 19.5 18.25 19.5H5.75C4.51 19.5 3.5 18.49 3.5 17.25V7.25Z";
const FOLDER_LIP_PATH = "M3.75 9.25H20.25";

const ExplorerChromeFolderIcon = ({ size = 20, className, strokeWidth = 1.75, ...props }: ExplorerChromeFolderIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("shrink-0", className)} {...props}>
    <path d={FOLDER_OUTLINE_PATH} stroke="var(--explorer-chrome-folder-stroke, currentColor)" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <path d={FOLDER_LIP_PATH} stroke="var(--explorer-chrome-folder-stroke, currentColor)" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </svg>
);

export { ExplorerChromeFolderIcon };
