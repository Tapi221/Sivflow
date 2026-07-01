import { cn } from "@web-renderer/lib/utils";
import type { SVGProps } from "react";



type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};



const FOLDER_OUTLINE_PATH = "M2.75 5.85C2.75 4.75 3.65 3.85 4.75 3.85H7.95C8.55 3.85 9.12 4.12 9.5 4.6L10.35 5.65H15.25C16.35 5.65 17.25 6.55 17.25 7.65V14.25C17.25 15.35 16.35 16.25 15.25 16.25H4.75C3.65 16.25 2.75 15.35 2.75 14.25V5.85Z";
const FOLDER_LIP_PATH = "M3 7.75H17";



const ExplorerChromeFolderIcon = ({ size = 15, className, ...props }: ExplorerChromeFolderIconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn("shrink-0", className)} {...props}>
    <path d={FOLDER_OUTLINE_PATH} stroke="var(--explorer-chrome-folder-stroke, currentColor)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d={FOLDER_LIP_PATH} stroke="var(--explorer-chrome-folder-stroke, currentColor)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);



export { ExplorerChromeFolderIcon };
