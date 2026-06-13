"use client";

import * as React from "react";
import * as ToolbarPrimitive from "@radix-ui/react-toolbar";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toolbarButtonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-colors hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 aria-checked:bg-accent aria-checked:text-accent-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 min-w-9 px-2",
        lg: "h-10 min-w-10 px-2.5",
        sm: "h-8 min-w-8 px-1.5",
      },
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
      },
    },
  },
);

type ToolbarButtonProps = {
  pressed?: boolean;
} & React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Button> & VariantProps<typeof toolbarButtonVariants>;

const Toolbar = ({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Root>) => {
  return <ToolbarPrimitive.Root className={cn("relative flex select-none items-center", className)} {...props} />;
};
const ToolbarToggleGroup = ({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.ToolbarToggleGroup>) => {
  return <ToolbarPrimitive.ToolbarToggleGroup className={cn("flex items-center", className)} {...props} />;
};
const ToolbarLink = ({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Link>) => {
  return <ToolbarPrimitive.Link className={cn("font-medium underline underline-offset-4", className)} {...props} />;
};
const ToolbarSeparator = ({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Separator>) => {
  return <ToolbarPrimitive.Separator className={cn("mx-2 my-1 w-px shrink-0 bg-border", className)} {...props} />;
};
const ToolbarButton = ({ className, size = "sm", variant, ...props }: ToolbarButtonProps) => {
  return <ToolbarPrimitive.Button className={cn(toolbarButtonVariants({ size, variant }), className)} {...props} />;
};
const ToolbarToggleItem = ({ className, size = "sm", variant, ...props }: React.ComponentProps<typeof ToolbarPrimitive.ToggleItem> & VariantProps<typeof toolbarButtonVariants>) => {
  return <ToolbarPrimitive.ToggleItem className={cn(toolbarButtonVariants({ size, variant }), className)} {...props} />;
};
const ToolbarGroup = ({ children, className }: React.ComponentProps<"div">) => {
  return (
    <div className={cn("group/toolbar-group relative hidden has-[button]:flex", className)}>
      <div className="flex items-center">{children}</div>
    </div>
  );
};
const ToolbarMenuGroup = ({ children, className }: React.ComponentProps<"div">) => {
  return <div className={cn("my-1.5", className)}>{children}</div>;
};

export { Toolbar, ToolbarToggleGroup, ToolbarLink, ToolbarSeparator, ToolbarButton, ToolbarToggleItem, ToolbarGroup, ToolbarMenuGroup };
export type { ToolbarButtonProps };
