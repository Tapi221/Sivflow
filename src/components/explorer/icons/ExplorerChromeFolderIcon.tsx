import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const FOLDER_TAB_PATH = "M3.1 5.2C3.1 4.1 4 3.2 5.1 3.2H8.1C8.7 3.2 9.2 3.5 9.6 4L10.6 5.3H15C16.1 5.3 17 6.2 17 7.3V7.8H3.1V5.2Z";
const FOLDER_BODY_PATH = "M3 7.1H17.1C17.8 7.1 18.3 7.7 18.2 8.4L16.9 15.2C16.7 16.2 15.9 16.8 14.9 16.8H5.1C4.1 16.8 3.3 16.2 3.1 15.2L1.9 8.4C1.7 7.7 2.3 7.1 3 7.1Z";

const ExplorerChromeFolderIcon = ({ size = 15, className, ...props }: ExplorerChromeFolderIconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn("shrink-0", className)} {...props}>
    <path d={FOLDER_TAB_PATH} fill="var(--explorer-chrome-folder-tab-fill, #dedbd2)" stroke="var(--explorer-chrome-folder-stroke, #8b8a84)" strokeWidth="1.45" strokeLinejoin="round" />
    <path d={FOLDER_BODY_PATH} fill="var(--explorer-chrome-folder-fill, #f0efe9)" stroke="var(--explorer-chrome-folder-stroke, #8b8a84)" strokeWidth="1.45" strokeLinejoin="round" />
    <path d="M4.8 10.3H15.2" stroke="var(--explorer-chrome-folder-highlight, #fbfaf6)" strokeWidth="1.35" strokeLinecap="round" opacity="0.7" />
  </svg>
);

export { ExplorerChromeFolderIcon };
