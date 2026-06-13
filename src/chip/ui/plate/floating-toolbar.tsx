"use client";

import * as React from "react";

import { Toolbar } from "./toolbar";

import { cn } from "@/lib/utils";



const FloatingToolbar = ({ className, ...props }: React.ComponentProps<typeof Toolbar>) => {
  return (
    <Toolbar
      {...props}
      className={cn(
        "scrollbar-hide absolute z-50 overflow-x-auto whitespace-nowrap rounded-md border bg-popover p-1 opacity-100 shadow-md print:hidden",
        "max-w-[80vw]",
        className,
      )}
    />
  );
};



export { FloatingToolbar };
