import type { SVGProps } from "react";



type ExplorerNavIconProps = SVGProps<SVGSVGElement>;



const ExplorerFolderNavIcon = ({ className, ...rest }: ExplorerNavIconProps) => {
  return (<svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" className={className} aria-hidden="true" {...rest} > <path d="M1.75 3.75a1 1 0 0 1 1-1H6l1.45 1.45h5.8a1 1 0 0 1 1 1v6.95a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1V3.75Z" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" /> </svg>);
};
const ExplorerTagMapNavIcon = ({ className, ...rest }: ExplorerNavIconProps) => {
  return (<svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" className={className} aria-hidden="true" {...rest} > <path d="M4.25 4.25H8M8 4.25L11.75 2.9M8 4.25L11.75 7.1M4.25 4.25V11.75" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /> <circle cx="4.25" cy="4.25" r="1.6" stroke="currentColor" strokeWidth="1.1" /> <circle cx="11.75" cy="2.9" r="1.6" stroke="currentColor" strokeWidth="1.1" /> <circle cx="11.75" cy="7.1" r="1.6" stroke="currentColor" strokeWidth="1.1" /> <circle cx="4.25" cy="11.75" r="1.6" stroke="currentColor" strokeWidth="1.1" /> </svg>);
};
const ExplorerDictionaryNavIcon = ({ className, ...rest }: ExplorerNavIconProps) => {
  return (<svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" className={className} aria-hidden="true" {...rest} > <path d="M3 2.5h8.4A1.6 1.6 0 0 1 13 4.1V13.5H4.6A1.6 1.6 0 0 0 3 15V2.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /> <path d="M4.6 15V4.1A1.6 1.6 0 0 1 6.2 2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /> <path d="M6.6 5.55h3.8M6.6 7.95h3.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /> </svg>);
};
const ExplorerQuestionNavIcon = ({ className, ...rest }: ExplorerNavIconProps) => {
  return (<svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" className={className} aria-hidden="true" {...rest} > <path d="M8 10.95v-.62c0-.82.38-1.22.94-1.6.64-.43 1.42-.96 1.42-2 0-1.38-1.1-2.46-2.61-2.46-1.28 0-2.33.86-2.57 2.03" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /> <circle cx="8" cy="12.7" r="0.66" fill="currentColor" /> <path d="M8 1.6a6.4 6.4 0 1 0 0 12.8A6.4 6.4 0 0 0 8 1.6Z" stroke="currentColor" strokeWidth="1.1" /> </svg>);
};



export { ExplorerFolderNavIcon, ExplorerTagMapNavIcon, ExplorerDictionaryNavIcon, ExplorerQuestionNavIcon };
