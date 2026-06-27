import { cn } from "@web-renderer/lib/utils";
import type { SVGProps } from "react";



type ExplorerChromeCardSetIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};



const CARD_SET_BACK_CARD_PATH = "M6.4 3.8H15.1C16.2 3.8 17.1 4.7 17.1 5.8V12.1";
const CARD_SET_MIDDLE_CARD_PATH = "M4.5 5.9H13.2C14.3 5.9 15.2 6.8 15.2 7.9V14.2";



const ExplorerChromeCardSetIcon = ({ size = 15, className, ...props }: ExplorerChromeCardSetIconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn("shrink-0", className)} {...props}>
    <path d={CARD_SET_BACK_CARD_PATH} stroke="var(--explorer-chrome-cardset-stroke, #8b8a84)" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    <path d={CARD_SET_MIDDLE_CARD_PATH} stroke="var(--explorer-chrome-cardset-stroke, #8b8a84)" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <rect x="2.9" y="8.1" width="12.2" height="8.1" rx="1.9" fill="var(--explorer-chrome-cardset-fill, #f0efe9)" stroke="var(--explorer-chrome-cardset-stroke, #8b8a84)" strokeWidth="1.45" />
    <path d="M5.3 11H12.7" stroke="var(--explorer-chrome-cardset-highlight, #fbfaf6)" strokeWidth="1.45" strokeLinecap="round" opacity="0.9" />
    <path d="M5.3 13.4H10.7" stroke="var(--explorer-chrome-cardset-highlight, #fbfaf6)" strokeWidth="1.45" strokeLinecap="round" opacity="0.75" />
  </svg>
);



export { ExplorerChromeCardSetIcon };
