import type { HTMLAttributes, ReactNode } from "react";

import {
  floatingSurfaceVariants,
  type FloatingSurfaceVariantProps,
} from "@/components/ui/floating-surface";
import { cn } from "@/lib/utils";

type PanelSurfaceProps = HTMLAttributes<HTMLDivElement> &
  FloatingSurfaceVariantProps & {
    children: ReactNode;
  };

export const PanelSurface = ({
  surface = "panel",
  className,
  children,
  ...props
}: PanelSurfaceProps) => {
  return (
    <div
      className={cn(floatingSurfaceVariants({ surface }), className)}
      {...props}
    >
      {children}
    </div>
  );
};
