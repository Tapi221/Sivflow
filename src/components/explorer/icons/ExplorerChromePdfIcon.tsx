import { cn } from "@web-renderer/lib/utils";
import type { SVGProps } from "react";



type ExplorerChromePdfIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};



const ExplorerChromePdfIcon = ({ size = 15, className, ...props }: ExplorerChromePdfIconProps) => (<svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn("shrink-0", className)} {...props} > <path d="M6.2 2.8H12.2L16.8 7.4V16.3C16.8 17.5 15.8 18.5 14.6 18.5H6.2C5 18.5 4 17.5 4 16.3V5C4 3.8 5 2.8 6.2 2.8Z" fill="var(--explorer-chrome-pdf-fill, #f0efe9)" stroke="var(--explorer-chrome-pdf-stroke, #8b8a84)" strokeWidth="1.5" strokeLinejoin="round" /> <path d="M12.2 2.8V7.4H16.8" stroke="var(--explorer-chrome-pdf-stroke, #8b8a84)" strokeWidth="1.5" strokeLinejoin="round" /> <rect x="5.2" y="12.6" width="9.6" height="3.2" rx="1.1" fill="var(--explorer-chrome-pdf-accent, #c7b19c)" opacity="0.9" /> <path d="M6.6 10.4H13.4" stroke="var(--explorer-chrome-pdf-highlight, #fbfaf6)" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" /> </svg>);



export { ExplorerChromePdfIcon };
