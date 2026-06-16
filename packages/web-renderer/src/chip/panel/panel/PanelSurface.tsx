import type { FloatingSurfaceVariantProps } from "@web-renderer/chip/ui/floating-surface";
import { floatingSurfaceVariants } from "@web-renderer/chip/ui/floating-surface";
import { cn } from "@web-renderer/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

type PanelSurfaceProps = HTMLAttributes<HTMLDivElement> &
  FloatingSurfaceVariantProps & {
    children: ReactNode;
  };

const PanelSurface = ({ surface = "panel", className, children, ...props }: PanelSurfaceProps) => {
  return (<div className={cn(floatingSurfaceVariants({ surface }), className)} {...props} > {children} </div>);
};

export { PanelSurface };
