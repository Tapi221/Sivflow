import { cn } from "@web-renderer/lib/utils";
import type { HTMLAttributes } from "react";

type CreateActionPlusIconProps = HTMLAttributes<HTMLSpanElement> & {
  iconClassName?: string;
};

const CreateActionPlusIcon = ({ className, iconClassName, ...props }: CreateActionPlusIconProps) => {
  return (<span className={cn("flex h-4 w-4 items-center justify-center rounded-full bg-[#007aff] text-white shadow-[0_2px_6px_rgba(0,122,255,0.28)] transition-transform duration-150 group-hover:scale-105", className)} aria-hidden="true" {...props} > <svg viewBox="0 0 16 16" fill="none" className={cn("h-3 w-3", iconClassName)} > <path d="M8 3.75V12.25M3.75 8H12.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> </svg> </span>);
};

export { CreateActionPlusIcon };
