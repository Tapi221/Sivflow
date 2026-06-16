"use client";

import "@web-renderer/chip/panel/Surface.Panel.css";

import * as React from "react";

import * as PopoverPrimitive from "@radix-ui/react-popover";

import type { FloatingSurfaceVariantProps } from "./floating-surface";

import { cn } from "@web-renderer/lib/utils";



type PopoverContentProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
  surface?: FloatingSurfaceVariantProps["surface"];
};



const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;



const getPopoverSurfaceClassName = (surface?: FloatingSurfaceVariantProps["surface"]): string | null => {
  if (surface === "plain") return null;
  return "surface-panel";
};



const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = "center", sideOffset = 4, surface, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        getPopoverSurfaceClassName(surface),
        "z-50 w-72 rounded-md border p-4 text-popover-foreground outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));



PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
