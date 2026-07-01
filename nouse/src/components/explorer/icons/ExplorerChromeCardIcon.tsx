import { cn } from "@web-renderer/lib/utils";
import type { SVGProps } from "react";



type ExplorerChromeCardIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};



const ExplorerChromeCardIcon = ({ size = 15, className, ...props }: ExplorerChromeCardIconProps) => (<svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn("shrink-0", className)} {...props} > <path d="M6.2 2.8H12.2L16.8 7.4V16.3C16.8 17.5 15.8 18.5 14.6 18.5H6.2C5 18.5 4 17.5 4 16.3V5C4 3.8 5 2.8 6.2 2.8Z" fill="var(--explorer-chrome-card-fill, #f0efe9)" stroke="var(--explorer-chrome-card-stroke, #8b8a84)" strokeWidth="1.5" strokeLinejoin="round" /> <path d="M12.2 2.8V7.4H16.8" stroke="var(--explorer-chrome-card-stroke, #8b8a84)" strokeWidth="1.5" strokeLinejoin="round" /> <path d="M6.2 10.2H13.8" stroke="var(--explorer-chrome-card-highlight, #fbfaf6)" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" /> <path d="M6.2 13.2H11.8" stroke="var(--explorer-chrome-card-highlight, #fbfaf6)" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" /> </svg>);



export { ExplorerChromeCardIcon };
