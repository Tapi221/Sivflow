import type { HTMLAttributes, ReactNode } from "react";
import type { FloatingSurfaceVariantProps } from "@/chip/ui/floating-surface";
import { floatingSurfaceVariants } from "@/chip/ui/floating-surface";
import { cn } from "@/lib/utils";

type PanelSurfaceProps = HTMLAttributes<HTMLDivElement> &
  FloatingSurfaceVariantProps & {
    children: ReactNode;
  };

const PanelSurface = ({ surface = "panel", className, children, ...props }: PanelSurfaceProps) => {
  return (<div className={cn(floatingSurfaceVariants({ surface }), className)} {...props} > {children} </div>);
};

export { PanelSurface };
