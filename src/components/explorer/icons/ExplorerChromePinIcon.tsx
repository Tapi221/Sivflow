import { cn } from "@web-renderer/lib/utils";
import type { SVGProps } from "react";



type ExplorerChromePinIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};



const ExplorerChromePinIcon = ({ size = 14, className, ...props }: ExplorerChromePinIconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("shrink-0", className)} {...props} > <path d="M9 3H15" stroke="var(--explorer-chrome-pin-stroke, #8b8a84)" strokeWidth="1.8" strokeLinecap="round" /> <path d="M10 3V10L8 14H16L14 10V3" stroke="var(--explorer-chrome-pin-stroke, #8b8a84)" strokeWidth="1.8" strokeLinejoin="round" /> <path d="M12 14V21" stroke="var(--explorer-chrome-pin-stroke, #8b8a84)" strokeWidth="1.8" strokeLinecap="round" /> </svg>);



export { ExplorerChromePinIcon };
