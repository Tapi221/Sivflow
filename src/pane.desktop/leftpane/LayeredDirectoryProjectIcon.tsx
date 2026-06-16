import { cn } from "@web-renderer/lib/utils";



type LayeredDirectoryProjectIconProps = {
  className?: string;
};



const LayeredDirectoryProjectIcon = ({ className }: LayeredDirectoryProjectIconProps) => <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={cn("h-4 w-4 shrink-0", className)}><path d="M7.25 6V5.1A1.85 1.85 0 0 1 9.1 3.25h1.8a1.85 1.85 0 0 1 1.85 1.85V6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /><path d="M4.75 6.25h10.5A2.25 2.25 0 0 1 17.5 8.5v5.25A2.25 2.25 0 0 1 15.25 16H4.75a2.25 2.25 0 0 1-2.25-2.25V8.5a2.25 2.25 0 0 1 2.25-2.25Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" /><path d="M2.75 10.25h14.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" /><path d="M8.9 10.25h2.2v1.45H8.9v-1.45Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" /></svg>;



export { LayeredDirectoryProjectIcon };
